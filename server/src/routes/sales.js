import { Router } from 'express';
import { all, get, run, transaction, today, now, round2 } from '../db.js';
import { requireAuth, requireAdmin, HttpError } from '../auth.js';

const router = Router();
router.use(requireAuth);

// The shop accepts cash and mobile money (MoMo) only.
const PAYMENT_METHODS = ['cash', 'mobile'];
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '');

/**
 * Record a sale: { items: [{ productId, quantity }], paymentMethod, customerName }
 * Prices always come from the database, never from the browser.
 */
router.post('/', (req, res) => {
  const { items, paymentMethod = 'cash', customerName } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) throw new HttpError(400, 'The cart is empty');
  if (!PAYMENT_METHODS.includes(paymentMethod)) throw new HttpError(400, 'Payment must be cash or mobile money');

  // Merge duplicate lines for the same product.
  const wanted = new Map();
  for (const it of items) {
    const id = Number(it.productId);
    const qty = Number(it.quantity);
    if (!Number.isInteger(id) || !Number.isInteger(qty) || qty <= 0) throw new HttpError(400, 'Invalid item in cart');
    wanted.set(id, (wanted.get(id) || 0) + qty);
  }

  const saleId = transaction(() => {
    const todayStr = today();
    let total = 0;
    const lines = [];
    for (const [id, qty] of wanted) {
      const p = get('SELECT * FROM products WHERE id = ?', id);
      if (!p || !p.active) throw new HttpError(400, 'A product in the cart is no longer available');
      if (p.expiry_date && p.expiry_date < todayStr) throw new HttpError(400, `${p.name} has expired and cannot be sold`);
      if (p.quantity < qty) throw new HttpError(400, `Only ${p.quantity} of ${p.name} left in stock`);
      total += p.selling_price * qty;
      lines.push({ p, qty });
    }

    const { lastInsertRowid: id } = run(
      'INSERT INTO sales (user_id, total, payment_method, customer_name) VALUES (?, ?, ?, ?)',
      req.user.id, round2(total), paymentMethod, customerName?.trim() || null
    );
    for (const { p, qty } of lines) {
      run(
        `INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, cost_price)
         VALUES (?, ?, ?, ?, ?, ?)`,
        id, p.id, p.name, qty, p.selling_price, p.cost_price
      );
      run('UPDATE products SET quantity = quantity - ?, updated_at = ? WHERE id = ?', qty, now(), p.id);
      run(
        `INSERT INTO stock_movements (product_id, user_id, change, reason, sale_id) VALUES (?, ?, ?, 'sale', ?)`,
        p.id, req.user.id, -qty, id
      );
    }
    return id;
  });

  res.status(201).json(loadSale(saleId, req.user));
});

function loadSale(id, user) {
  const sale = get(
    `SELECT s.*, u.name AS seller_name, v.name AS voided_by_name
     FROM sales s JOIN users u ON u.id = s.user_id LEFT JOIN users v ON v.id = s.voided_by
     WHERE s.id = ?`,
    id
  );
  if (!sale) return null;
  const items = all(
    'SELECT id, product_id, product_name, quantity, unit_price, cost_price FROM sale_items WHERE sale_id = ? ORDER BY id',
    id
  );
  sale.items = user.role === 'admin' ? items : items.map(({ cost_price, ...rest }) => rest);
  return sale;
}

/**
 * List sales. ?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Attendants only see their own sales.
 */
router.get('/', (req, res) => {
  const params = [];
  const conds = [];
  if (req.query.from) {
    if (!isDate(req.query.from)) throw new HttpError(400, 'Dates must be YYYY-MM-DD');
    conds.push('s.created_at >= ?');
    params.push(req.query.from);
  }
  if (req.query.to) {
    if (!isDate(req.query.to)) throw new HttpError(400, 'Dates must be YYYY-MM-DD');
    conds.push(`s.created_at < date(?, '+1 day')`);
    params.push(req.query.to);
  }
  if (req.user.role !== 'admin') {
    conds.push('s.user_id = ?');
    params.push(req.user.id);
  }

  res.json(all(
    `SELECT s.*, u.name AS seller_name,
       (SELECT COALESCE(SUM(quantity), 0) FROM sale_items WHERE sale_id = s.id) AS item_count
     FROM sales s JOIN users u ON u.id = s.user_id
     ${conds.length ? 'WHERE ' + conds.join(' AND ') : ''}
     ORDER BY s.created_at DESC, s.id DESC LIMIT 500`,
    ...params
  ));
});

router.get('/:id', (req, res) => {
  const sale = loadSale(Number(req.params.id), req.user);
  if (!sale || (req.user.role !== 'admin' && sale.user_id !== req.user.id)) throw new HttpError(404, 'Sale not found');
  res.json(sale);
});

// Owner can void a sale (e.g. a mistake or a return). Stock is put back.
router.post('/:id/void', requireAdmin, (req, res) => {
  const reason = req.body?.reason?.trim();
  if (!reason) throw new HttpError(400, 'Please give a reason for voiding');
  const id = Number(req.params.id);

  transaction(() => {
    const sale = get('SELECT * FROM sales WHERE id = ?', id);
    if (!sale) throw new HttpError(404, 'Sale not found');
    if (sale.voided_at) throw new HttpError(400, 'This sale is already voided');

    for (const it of all('SELECT * FROM sale_items WHERE sale_id = ?', id)) {
      run('UPDATE products SET quantity = quantity + ?, updated_at = ? WHERE id = ?', it.quantity, now(), it.product_id);
      run(
        `INSERT INTO stock_movements (product_id, user_id, change, reason, note, sale_id) VALUES (?, ?, ?, 'void', ?, ?)`,
        it.product_id, req.user.id, it.quantity, reason, id
      );
    }
    run('UPDATE sales SET voided_at = ?, voided_by = ?, void_reason = ? WHERE id = ?', now(), req.user.id, reason, id);
  });

  res.json(loadSale(id, req.user));
});

export default router;
