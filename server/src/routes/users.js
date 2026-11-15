import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { all, get, run, isUniqueError } from '../db.js';
import { asyncHandler, requireAuth, requireAdmin, HttpError } from '../auth.js';

const router = Router();
router.use(requireAuth, requireAdmin);

const ROLES = ['admin', 'attendant'];
const COLS = 'id, name, username, role, active, created_at';

router.get('/', (_req, res) => {
  res.json(all(`SELECT ${COLS} FROM users ORDER BY active DESC, name`));
});

router.post('/', asyncHandler(async (req, res) => {
  const { name, username, password, role = 'attendant' } = req.body || {};
  if (!name?.trim() || !username?.trim()) throw new HttpError(400, 'Name and username are required');
  if (!password || password.length < 6) throw new HttpError(400, 'Password must be at least 6 characters');
  if (!ROLES.includes(role)) throw new HttpError(400, 'Invalid role');

  try {
    const { lastInsertRowid } = run(
      'INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, ?)',
      name.trim(), username.trim().toLowerCase(), await bcrypt.hash(password, 10), role
    );
    res.status(201).json(get(`SELECT ${COLS} FROM users WHERE id = ?`, lastInsertRowid));
  } catch (err) {
    if (isUniqueError(err)) throw new HttpError(409, 'That username is already taken');
    throw err;
  }
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { name, role, active, password } = req.body || {};
  if (role !== undefined && !ROLES.includes(role)) throw new HttpError(400, 'Invalid role');
  if (password !== undefined && password !== '' && password.length < 6) {
    throw new HttpError(400, 'Password must be at least 6 characters');
  }

  // Don't let the owner lock themselves out.
  if (id === req.user.id && (active === false || role === 'attendant')) {
    throw new HttpError(400, 'You cannot disable or demote your own account');
  }

  const { changes } = run(
    `UPDATE users SET
       name = COALESCE(?, name),
       role = COALESCE(?, role),
       active = COALESCE(?, active),
       password_hash = COALESCE(?, password_hash)
     WHERE id = ?`,
    name?.trim() || null, role ?? null, active ?? null, password ? await bcrypt.hash(password, 10) : null, id
  );
  if (!changes) throw new HttpError(404, 'User not found');
  res.json(get(`SELECT ${COLS} FROM users WHERE id = ?`, id));
}));

export default router;
