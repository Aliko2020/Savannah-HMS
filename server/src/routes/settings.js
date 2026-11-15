import { Router } from 'express';
import { all, run, transaction } from '../db.js';
import { requireAuth, requireAdmin, HttpError } from '../auth.js';

const router = Router();

// Every setting, with its default and a validator.
const FIELDS = {
  shop_name: { default: 'Savannah Pharmacy', max: 60, required: true },
  phone: { default: '', max: 40 },
  address: { default: '', max: 120 },
  receipt_footer: { default: 'Thank you. Get well soon!', max: 120 },
  currency: { default: 'GH₵', max: 6, required: true },
  paper_width: { default: '80', options: ['58', '80'] },
};

export function getSettings() {
  const stored = Object.fromEntries(all('SELECT key, value FROM settings').map((r) => [r.key, r.value]));
  return Object.fromEntries(Object.entries(FIELDS).map(([k, f]) => [k, stored[k] ?? f.default]));
}

// Shop name, phone and currency are needed on the login page and receipts,
// and contain nothing private, so anyone can read them.
router.get('/', (_req, res) => res.json(getSettings()));

router.put('/', requireAuth, requireAdmin, (req, res) => {
  const body = req.body || {};
  const updates = [];
  for (const [key, f] of Object.entries(FIELDS)) {
    if (body[key] === undefined) continue;
    const value = String(body[key]).trim();
    if (f.required && !value) throw new HttpError(400, `${key.replace('_', ' ')} cannot be empty`);
    if (f.max && value.length > f.max) throw new HttpError(400, `${key.replace('_', ' ')} is too long (max ${f.max})`);
    if (f.options && !f.options.includes(value)) throw new HttpError(400, `Invalid ${key.replace('_', ' ')}`);
    updates.push([key, value]);
  }
  transaction(() => {
    for (const [k, v] of updates) {
      run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', k, v);
    }
  });
  res.json(getSettings());
});

export default router;
