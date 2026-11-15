import { Router } from 'express';
import { all, get, today, round2 } from '../db.js';
import { requireAuth, requireAdmin, HttpError } from '../auth.js';

const router = Router();
router.use(requireAuth, requireAdmin);

const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '');

// Sales summary for a date range (defaults to today). Voided sales are excluded.
router.get('/summary', (req, res) => {
  const from = req.query.from || today();
  const to = req.query.to || today();
  if (!isDate(from) || !isDate(to)) throw new HttpError(400, 'Dates must be YYYY-MM-DD');

  const range = `s.voided_at IS NULL AND s.created_at >= ? AND s.created_at < date(?, '+1 day')`;

  const t = get(
    `SELECT COUNT(DISTINCT s.id) AS sales_count,
            COALESCE(SUM(i.quantity * i.unit_price), 0) AS revenue,
            COALESCE(SUM(i.quantity * i.cost_price), 0) AS cost,
            COALESCE(SUM(i.quantity), 0) AS items_sold
     FROM sales s JOIN sale_items i ON i.sale_id = s.id WHERE ${range}`,
    from, to
  );
  const byDay = all(
    `SELECT substr(s.created_at, 1, 10) AS day, COUNT(*) AS sales_count, SUM(s.total) AS revenue
     FROM sales s WHERE ${range} GROUP BY day ORDER BY day`,
    from, to
  );
  const byPayment = all(
    `SELECT s.payment_method, COUNT(*) AS sales_count, SUM(s.total) AS revenue
     FROM sales s WHERE ${range} GROUP BY s.payment_method ORDER BY revenue DESC`,
    from, to
  );
  const bySeller = all(
    `SELECT u.name, COUNT(*) AS sales_count, SUM(s.total) AS revenue
     FROM sales s JOIN users u ON u.id = s.user_id WHERE ${range} GROUP BY u.id ORDER BY revenue DESC`,
    from, to
  );
  const topProducts = all(
    `SELECT i.product_name, SUM(i.quantity) AS quantity, SUM(i.quantity * i.unit_price) AS revenue,
            SUM(i.quantity * (i.unit_price - i.cost_price)) AS profit
     FROM sales s JOIN sale_items i ON i.sale_id = s.id WHERE ${range}
     GROUP BY i.product_name ORDER BY quantity DESC LIMIT 10`,
    from, to
  );

  const money = (rows, ...keys) => rows.map((r) => ({ ...r, ...Object.fromEntries(keys.map((k) => [k, round2(r[k])])) }));
  res.json({
    from,
    to,
    salesCount: t.sales_count,
    itemsSold: t.items_sold,
    revenue: round2(t.revenue),
    cost: round2(t.cost),
    profit: round2(t.revenue - t.cost),
    byDay: money(byDay, 'revenue'),
    byPayment: money(byPayment, 'revenue'),
    bySeller: money(bySeller, 'revenue'),
    topProducts: money(topProducts, 'revenue', 'profit'),
  });
});

// Things the owner should act on: low stock, expired, expiring soon.
router.get('/alerts', (req, res) => {
  const days = Math.min(Math.max(Number(req.query.days) || 60, 1), 365);
  const todayStr = today();
  const stockValue = get(
    `SELECT COALESCE(SUM(quantity * cost_price), 0) AS at_cost, COALESCE(SUM(quantity * selling_price), 0) AS at_retail,
            COUNT(*) AS product_count
     FROM products WHERE active = 1`
  );
  res.json({
    lowStock: all('SELECT id, name, quantity, reorder_level FROM products WHERE active = 1 AND quantity <= reorder_level ORDER BY quantity, name'),
    expired: all(
      'SELECT id, name, quantity, expiry_date FROM products WHERE active = 1 AND quantity > 0 AND expiry_date < ? ORDER BY expiry_date',
      todayStr
    ),
    expiringSoon: all(
      `SELECT id, name, quantity, expiry_date FROM products
       WHERE active = 1 AND quantity > 0 AND expiry_date >= ? AND expiry_date <= date(?, '+' || ? || ' days')
       ORDER BY expiry_date`,
      todayStr, todayStr, days
    ),
    expiringWithinDays: days,
    stockValue: { ...stockValue, at_cost: round2(stockValue.at_cost), at_retail: round2(stockValue.at_retail) },
  });
});

export default router;
