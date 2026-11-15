import { Router } from 'express';
import { query, withTransaction, today } from '../db.js';
import { asyncHandler, requireAuth, requireAdmin, HttpError } from '../auth.js';

const router = Router();
router.use(requireAuth);

const PAYMENT_METHODS = ['cash', 'card', 'mobile'];

/**
 * Record a sale: { items: [{ productId, quantity }], paymentMethod, customerName }
 * Prices always come from the database, never from the browser.
 */
router.post('/', asyncHandler(async (req, res) => {
  const { items, paymentMethod = 'cash', customerName } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) throw new HttpError(400, 'The cart is empty');
  if (!PAYMENT_METHODS.includes(paymentMethod)) throw new HttpError(400, 'Invalid payment method');

  // Merge duplicate lines for the same product.
  const wanted = new Map();
  for (const it of items) {
    const id = Number(it.productId);
    const qty = Number(it.quantity);
    if (!Number.isInteger(id) || !Number.isInteger(qty) || qty <= 0) throw new HttpError(400, 'Invalid item in cart');
    wanted.set(id, (wanted.get(id) || 0) + qty);
  }

  const sale = await withTransaction(async (c) => {
    // Lock rows in id order to avoid deadlocks between two tills.
    const ids = [...wanted.keys()].sort((a, b) => a - b);
    const { rows: products } = await c.query(
      'SELECT * FROM products WHERE id = ANY($1) ORDER BY id FOR UPDATE',
      [ids]
    );
    const byId = new Map(products.map((p) => [p.id, p]));
    const todayStr = today();

    let total = 0;
    const lines = [];
    for (const [id, qty] of wanted) {
      const p = byId.get(id);
      if (!p || !p.active) throw new HttpError(400, 'A product in the cart is no longer available');
      if (p.expiry_date && p.expiry_date < todayStr) throw new HttpError(400, `${p.name} has expired and cannot be sold`);
      if (p.quantity < qty) throw new HttpError(400, `Only ${p.quantity} of ${p.name} left in stock`);
      total += Number(p.selling_price) * qty;
      lines.push({ p, qty });
    }
    total = Math.round(total * 100) / 100;

    const { rows: [s] } = await c.query(
      `INSERT INTO sales (user_id, total, payment_method, customer_name) VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.id, total, paymentMethod, customerName?.trim() || null]
    );
    for (const { p, qty } of lines) {
      await c.query(
        `INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, cost_price)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [s.id, p.id, p.name, qty, p.selling_price, p.cost_price]
      );
      await c.query('UPDATE products SET quantity = quantity - $2, updated_at = now() WHERE id = $1', [p.id, qty]);
      await c.query(
        `INSERT INTO stock_movements (product_id, user_id, change, reason, sale_id) VALUES ($1, $2, $3, 'sale', $4)`,
        [p.id, req.user.id, -qty, s.id]
      );
    }
    return s.id;
  });

  res.status(201).json(await loadSale(sale, req.user));
}));

async function loadSale(id, user) {
  const { rows: [sale] } = await query(
    `SELECT s.*, u.name AS seller_name, v.name AS voided_by_name
     FROM sales s JOIN users u ON u.id = s.user_id LEFT JOIN users v ON v.id = s.voided_by
     WHERE s.id = $1`,
    [id]
  );
  if (!sale) return null;
  const { rows: items } = await query(
    'SELECT id, product_id, product_name, quantity, unit_price, cost_price FROM sale_items WHERE sale_id = $1 ORDER BY id',
    [id]
  );
  sale.items = user.role === 'admin' ? items : items.map(({ cost_price, ...rest }) => rest);
  return sale;
}

/**
 * List sales. ?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Attendants only see their own sales.
 */
router.get('/', asyncHandler(async (req, res) => {
  const params = [];
  const conds = [];
  if (req.query.from) { params.push(req.query.from); conds.push(`s.created_at >= $${params.length}::date`); }
  if (req.query.to) { params.push(req.query.to); conds.push(`s.created_at < $${params.length}::date + 1`); }
  if (req.user.role !== 'admin') { params.push(req.user.id); conds.push(`s.user_id = $${params.length}`); }

  const { rows } = await query(
    `SELECT s.*, u.name AS seller_name,
       (SELECT COALESCE(SUM(quantity), 0)::int FROM sale_items WHERE sale_id = s.id) AS item_count
     FROM sales s JOIN users u ON u.id = s.user_id
     ${conds.length ? 'WHERE ' + conds.join(' AND ') : ''}
     ORDER BY s.created_at DESC LIMIT 500`,
    params
  );
  res.json(rows);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const sale = await loadSale(Number(req.params.id), req.user);
  if (!sale || (req.user.role !== 'admin' && sale.user_id !== req.user.id)) throw new HttpError(404, 'Sale not found');
  res.json(sale);
}));

// Owner can void a sale (e.g. a mistake or a return). Stock is put back.
router.post('/:id/void', requireAdmin, asyncHandler(async (req, res) => {
  const reason = req.body?.reason?.trim();
  if (!reason) throw new HttpError(400, 'Please give a reason for voiding');
  const id = Number(req.params.id);

  await withTransaction(async (c) => {
    const { rows: [sale] } = await c.query('SELECT * FROM sales WHERE id = $1 FOR UPDATE', [id]);
    if (!sale) throw new HttpError(404, 'Sale not found');
    if (sale.voided_at) throw new HttpError(400, 'This sale is already voided');

    const { rows: items } = await c.query('SELECT * FROM sale_items WHERE sale_id = $1 ORDER BY product_id', [id]);
    for (const it of items) {
      await c.query('UPDATE products SET quantity = quantity + $2, updated_at = now() WHERE id = $1', [it.product_id, it.quantity]);
      await c.query(
        `INSERT INTO stock_movements (product_id, user_id, change, reason, note, sale_id) VALUES ($1, $2, $3, 'void', $4, $5)`,
        [it.product_id, req.user.id, it.quantity, reason, id]
      );
    }
    await c.query('UPDATE sales SET voided_at = now(), voided_by = $2, void_reason = $3 WHERE id = $1', [id, req.user.id, reason]);
  });

  res.json(await loadSale(id, req.user));
}));

export default router;
