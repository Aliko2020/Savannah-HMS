import { Router } from 'express';
import { query, withTransaction } from '../db.js';
import { asyncHandler, requireAuth, requireAdmin, HttpError } from '../auth.js';

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
  if (body.expiry_date !== undefined) p.expiry_date = body.expiry_date || null;
  if (body.requires_prescription !== undefined) p.requires_prescription = Boolean(body.requires_prescription);
  if (body.active !== undefined) p.active = Boolean(body.active);
  return p;
}

const uniqueError = (err) => {
  if (err.code === '23505') return new HttpError(409, 'Another product already uses that barcode');
  return err;
};

// List products. ?search=, ?lowStock=1, ?includeInactive=1 (admin)
router.get('/', asyncHandler(async (req, res) => {
  const conds = [];
  const params = [];
  if (!(req.user.role === 'admin' && req.query.includeInactive === '1')) conds.push('active');
  if (req.query.search) {
    params.push(`%${req.query.search}%`);
    conds.push(`(name ILIKE $${params.length} OR barcode ILIKE $${params.length} OR category ILIKE $${params.length})`);
  }
  if (req.query.lowStock === '1') conds.push('quantity <= reorder_level');

  const { rows } = await query(
    `SELECT * FROM products ${conds.length ? 'WHERE ' + conds.join(' AND ') : ''} ORDER BY name LIMIT 500`,
    params
  );
  res.json(rows.map((p) => forRole(p, req.user.role)));
}));

router.get('/categories', asyncHandler(async (_req, res) => {
  const { rows } = await query('SELECT DISTINCT category FROM products WHERE active ORDER BY category');
  res.json(rows.map((r) => r.category));
}));

router.post('/', requireAdmin, asyncHandler(async (req, res) => {
  const p = parseProduct(req.body || {});
  const qty = req.body.quantity === undefined || req.body.quantity === '' ? 0 : Number(req.body.quantity);
  if (!Number.isInteger(qty) || qty < 0) throw new HttpError(400, 'Opening quantity must be a whole number of 0 or more');

  const product = await withTransaction(async (c) => {
    const cols = [...Object.keys(p), 'quantity'];
    const vals = [...Object.values(p), qty];
    const { rows } = await c.query(
      `INSERT INTO products (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`,
      vals
    ).catch((e) => { throw uniqueError(e); });
    if (qty > 0) {
      await c.query(
        `INSERT INTO stock_movements (product_id, user_id, change, reason, note) VALUES ($1, $2, $3, 'initial', 'Opening stock')`,
        [rows[0].id, req.user.id, qty]
      );
    }
    return rows[0];
  });
  res.status(201).json(product);
}));

// Edit product details. Quantity is changed only through /stock so it's always audited.
router.put('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const p = parseProduct(req.body || {}, { partial: true });
  const keys = Object.keys(p);
  if (!keys.length) throw new HttpError(400, 'Nothing to update');

  const { rows } = await query(
    `UPDATE products SET ${keys.map((k, i) => `${k} = $${i + 2}`).join(', ')}, updated_at = now()
     WHERE id = $1 RETURNING *`,
    [Number(req.params.id), ...Object.values(p)]
  ).catch((e) => { throw uniqueError(e); });
  if (!rows[0]) throw new HttpError(404, 'Product not found');
  res.json(rows[0]);
}));

// Restock or adjust stock: { change: +20, reason: 'restock' | 'adjustment' | 'expired' | 'damaged', note }
router.post('/:id/stock', requireAdmin, asyncHandler(async (req, res) => {
  const change = Number(req.body?.change);
  const reason = req.body?.reason || 'restock';
  const note = req.body?.note?.trim() || null;
  if (!Number.isInteger(change) || change === 0) throw new HttpError(400, 'Change must be a whole number other than 0');
  if (!['restock', 'adjustment', 'expired', 'damaged'].includes(reason)) throw new HttpError(400, 'Invalid reason');
  if (reason === 'restock' && change < 0) throw new HttpError(400, 'A restock must add stock');
  if ((reason === 'expired' || reason === 'damaged') && change > 0) throw new HttpError(400, 'Expired/damaged stock must be a removal');

  const product = await withTransaction(async (c) => {
    const { rows } = await c.query('SELECT * FROM products WHERE id = $1 FOR UPDATE', [Number(req.params.id)]);
    const prod = rows[0];
    if (!prod) throw new HttpError(404, 'Product not found');
    if (prod.quantity + change < 0) throw new HttpError(400, `Only ${prod.quantity} in stock`);

    const updated = await c.query(
      'UPDATE products SET quantity = quantity + $2, updated_at = now() WHERE id = $1 RETURNING *',
      [prod.id, change]
    );
    await c.query(
      'INSERT INTO stock_movements (product_id, user_id, change, reason, note) VALUES ($1, $2, $3, $4, $5)',
      [prod.id, req.user.id, change, reason, note]
    );
    return updated.rows[0];
  });
  res.json(product);
}));

// Stock history: all products, or one with ?productId=
router.get('/movements', requireAdmin, asyncHandler(async (req, res) => {
  const params = [];
  let where = '';
  if (req.query.productId) {
    params.push(Number(req.query.productId));
    where = 'WHERE m.product_id = $1';
  }
  const { rows } = await query(
    `SELECT m.*, p.name AS product_name, u.name AS user_name
     FROM stock_movements m
     JOIN products p ON p.id = m.product_id
     LEFT JOIN users u ON u.id = m.user_id
     ${where}
     ORDER BY m.created_at DESC, m.id DESC LIMIT 300`,
    params
  );
  res.json(rows);
}));

export default router;
