import { Router } from 'express';
import { all, get, run, transaction, now, isUniqueError } from '../db.js';
import { requireAuth, requireAdmin, HttpError } from '../auth.js';

const router = Router();
router.use(requireAuth);

/** Attendants don't see cost prices (the owner's margins). */
function forRole(product, role) {
  if (role === 'admin') return product;
  const { cost_price, ...rest } = product;
  return rest;
}

function parseProduct(body, { partial = false } = {}) {
  const p = {};
  const num = (v, field, { int = false } = {}) => {
    const n = Number(v);
    if (v === '' || v === null || !Number.isFinite(n) || n < 0 || (int && !Number.isInteger(n))) {
      throw new HttpError(400, `${field} must be a ${int ? 'whole ' : ''}number of 0 or more`);
    }
    return n;
  };

  if (body.name !== undefined) {
    if (!String(body.name).trim()) throw new HttpError(400, 'Name is required');
    p.name = String(body.name).trim();
  } else if (!partial) throw new HttpError(400, 'Name is required');

  if (body.selling_price !== undefined) p.selling_price = num(body.selling_price, 'Selling price');
  else if (!partial) throw new HttpError(400, 'Selling price is required');

  if (body.category !== undefined) p.category = String(body.category).trim() || 'General';
  if (body.barcode !== undefined) p.barcode = String(body.barcode).trim() || null;
  if (body.cost_price !== undefined) p.cost_price = num(body.cost_price, 'Cost price');
  if (body.reorder_level !== undefined) p.reorder_level = num(body.reorder_level, 'Reorder level', { int: true });
  if (body.expiry_date !== undefined) {
    if (body.expiry_date && !/^\d{4}-\d{2}-\d{2}$/.test(body.expiry_date)) throw new HttpError(400, 'Expiry date must be YYYY-MM-DD');
    p.expiry_date = body.expiry_date || null;
  }
  if (body.requires_prescription !== undefined) p.requires_prescription = Boolean(body.requires_prescription);
  if (body.active !== undefined) p.active = Boolean(body.active);
  return p;
}

function catchUnique(fn) {
  try {
    return fn();
  } catch (err) {
    if (isUniqueError(err)) throw new HttpError(409, 'Another product already uses that barcode');
    throw err;
  }
}

// List products. ?search=, ?lowStock=1, ?includeInactive=1 (admin)
router.get('/', (req, res) => {
  const conds = [];
  const params = [];
  if (!(req.user.role === 'admin' && req.query.includeInactive === '1')) conds.push('active = 1');
  if (req.query.search) {
    // LIKE in SQLite is case-insensitive for English letters.
    conds.push('(name LIKE ? OR barcode LIKE ? OR category LIKE ?)');
    const s = `%${req.query.search}%`;
    params.push(s, s, s);
  }
  if (req.query.lowStock === '1') conds.push('quantity <= reorder_level');

  const rows = all(
    `SELECT * FROM products ${conds.length ? 'WHERE ' + conds.join(' AND ') : ''} ORDER BY name COLLATE NOCASE LIMIT 500`,
    ...params
  );
  res.json(rows.map((p) => forRole(p, req.user.role)));
});

router.get('/categories', (_req, res) => {
  res.json(all('SELECT DISTINCT category FROM products WHERE active = 1 ORDER BY category').map((r) => r.category));
});

router.post('/', requireAdmin, (req, res) => {
  const p = parseProduct(req.body || {});
  const qty = req.body.quantity === undefined || req.body.quantity === '' ? 0 : Number(req.body.quantity);
  if (!Number.isInteger(qty) || qty < 0) throw new HttpError(400, 'Opening quantity must be a whole number of 0 or more');

  const product = transaction(() => {
    const cols = [...Object.keys(p), 'quantity'];
    const { lastInsertRowid: id } = catchUnique(() =>
      run(`INSERT INTO products (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`, ...Object.values(p), qty)
    );
    if (qty > 0) {
      run(
        `INSERT INTO stock_movements (product_id, user_id, change, reason, note) VALUES (?, ?, ?, 'initial', 'Opening stock')`,
        id, req.user.id, qty
      );
    }
    return get('SELECT * FROM products WHERE id = ?', id);
  });
  res.status(201).json(product);
});

// Edit product details. Quantity is changed only through /stock so it's always logged.
router.put('/:id', requireAdmin, (req, res) => {
  const p = parseProduct(req.body || {}, { partial: true });
  const keys = Object.keys(p);
  if (!keys.length) throw new HttpError(400, 'Nothing to update');
  const id = Number(req.params.id);

  const { changes } = catchUnique(() =>
    run(`UPDATE products SET ${keys.map((k) => `${k} = ?`).join(', ')}, updated_at = ? WHERE id = ?`, ...Object.values(p), now(), id)
  );
  if (!changes) throw new HttpError(404, 'Product not found');
  res.json(get('SELECT * FROM products WHERE id = ?', id));
});

// Restock or adjust stock: { change: +20, reason: 'restock' | 'adjustment' | 'expired' | 'damaged', note }
router.post('/:id/stock', requireAdmin, (req, res) => {
  const change = Number(req.body?.change);
  const reason = req.body?.reason || 'restock';
  const note = req.body?.note?.trim() || null;
  if (!Number.isInteger(change) || change === 0) throw new HttpError(400, 'Change must be a whole number other than 0');
  if (!['restock', 'adjustment', 'expired', 'damaged'].includes(reason)) throw new HttpError(400, 'Invalid reason');
  if (reason === 'restock' && change < 0) throw new HttpError(400, 'A restock must add stock');
  if ((reason === 'expired' || reason === 'damaged') && change > 0) throw new HttpError(400, 'Expired/damaged stock must be a removal');

  const product = transaction(() => {
    const prod = get('SELECT * FROM products WHERE id = ?', Number(req.params.id));
    if (!prod) throw new HttpError(404, 'Product not found');
    if (prod.quantity + change < 0) throw new HttpError(400, `Only ${prod.quantity} in stock`);

    run('UPDATE products SET quantity = quantity + ?, updated_at = ? WHERE id = ?', change, now(), prod.id);
    run(
      'INSERT INTO stock_movements (product_id, user_id, change, reason, note) VALUES (?, ?, ?, ?, ?)',
      prod.id, req.user.id, change, reason, note
    );
    return get('SELECT * FROM products WHERE id = ?', prod.id);
  });
  res.json(product);
});

// Stock history: all products, or one with ?productId=
router.get('/movements', requireAdmin, (req, res) => {
  const byProduct = req.query.productId !== undefined;
  res.json(all(
    `SELECT m.*, p.name AS product_name, u.name AS user_name
     FROM stock_movements m
     JOIN products p ON p.id = m.product_id
     LEFT JOIN users u ON u.id = m.user_id
     ${byProduct ? 'WHERE m.product_id = ?' : ''}
     ORDER BY m.created_at DESC, m.id DESC LIMIT 300`,
    ...(byProduct ? [Number(req.query.productId)] : [])
  ));
});

export default router;
