import { Router } from 'express';
import { query, today } from '../db.js';
import { asyncHandler, requireAuth, requireAdmin, HttpError } from '../auth.js';

const router = Router();
router.use(requireAuth, requireAdmin);

const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '');

// Sales summary for a date range (defaults to today). Voided sales are excluded.
router.get('/summary', asyncHandler(async (req, res) => {
  const todayStr = today();
  const from = req.query.from || todayStr;
  const to = req.query.to || todayStr;
  if (!isDate(from) || !isDate(to)) throw new HttpError(400, 'Dates must be YYYY-MM-DD');

  const range = `s.voided_at IS NULL AND s.created_at >= $1::date AND s.created_at < $2::date + 1`;
  const params = [from, to];

  const [totals, byDay, byPayment, bySeller, topProducts] = await Promise.all([
    query(
      `SELECT COUNT(DISTINCT s.id)::int AS sales_count,
              COALESCE(SUM(i.quantity * i.unit_price), 0) AS revenue,
              COALESCE(SUM(i.quantity * i.cost_price), 0) AS cost,
              COALESCE(SUM(i.quantity), 0)::int AS items_sold
       FROM sales s JOIN sale_items i ON i.sale_id = s.id WHERE ${range}`,
      params
    ),
    query(
      `SELECT to_char(s.created_at::date, 'YYYY-MM-DD') AS day, COUNT(*)::int AS sales_count, SUM(s.total) AS revenue
       FROM sales s WHERE ${range} GROUP BY 1 ORDER BY 1`,
      params
    ),
    query(
      `SELECT s.payment_method, COUNT(*)::int AS sales_count, SUM(s.total) AS revenue
       FROM sales s WHERE ${range} GROUP BY 1 ORDER BY 3 DESC`,
      params
    ),
    query(
      `SELECT u.name, COUNT(*)::int AS sales_count, SUM(s.total) AS revenue
       FROM sales s JOIN users u ON u.id = s.user_id WHERE ${range} GROUP BY u.name ORDER BY 3 DESC`,
      params
    ),
    query(
      `SELECT i.product_name, SUM(i.quantity)::int AS quantity, SUM(i.quantity * i.unit_price) AS revenue,
              SUM(i.quantity * (i.unit_price - i.cost_price)) AS profit
       FROM sales s JOIN sale_items i ON i.sale_id = s.id WHERE ${range}
       GROUP BY i.product_name ORDER BY 2 DESC LIMIT 10`,
      params
    ),
  ]);

  const t = totals.rows[0];
  res.json({
    from,
    to,
    salesCount: t.sales_count,
    itemsSold: t.items_sold,
    revenue: t.revenue,
    cost: t.cost,
    profit: Math.round((t.revenue - t.cost) * 100) / 100,
    byDay: byDay.rows,
    byPayment: byPayment.rows,
    bySeller: bySeller.rows,
    topProducts: topProducts.rows,
  });
}));

// Things the owner should act on: low stock, expired, expiring soon.
router.get('/alerts', asyncHandler(async (req, res) => {
  const days = Math.min(Math.max(Number(req.query.days) || 60, 1), 365);
  const [lowStock, expired, expiringSoon, stockValue] = await Promise.all([
    query('SELECT id, name, quantity, reorder_level FROM products WHERE active AND quantity <= reorder_level ORDER BY quantity, name'),
    query('SELECT id, name, quantity, expiry_date FROM products WHERE active AND quantity > 0 AND expiry_date < CURRENT_DATE ORDER BY expiry_date'),
    query(
      `SELECT id, name, quantity, expiry_date FROM products
       WHERE active AND quantity > 0 AND expiry_date >= CURRENT_DATE AND expiry_date <= CURRENT_DATE + $1::int
       ORDER BY expiry_date`,
      [days]
    ),
    query(
      `SELECT COALESCE(SUM(quantity * cost_price), 0) AS at_cost, COALESCE(SUM(quantity * selling_price), 0) AS at_retail,
              COUNT(*)::int AS product_count
       FROM products WHERE active`
    ),
  ]);
  res.json({
    lowStock: lowStock.rows,
    expired: expired.rows,
    expiringSoon: expiringSoon.rows,
    expiringWithinDays: days,
    stockValue: stockValue.rows[0],
  });
}));

export default router;
