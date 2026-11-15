import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { asyncHandler, requireAuth, requireAdmin, HttpError } from '../auth.js';

const router = Router();
router.use(requireAuth, requireAdmin);

const ROLES = ['admin', 'attendant'];

router.get('/', asyncHandler(async (_req, res) => {
  const { rows } = await query(
    'SELECT id, name, username, role, active, created_at FROM users ORDER BY active DESC, name'
  );
  res.json(rows);
}));

router.post('/', asyncHandler(async (req, res) => {
  const { name, username, password, role = 'attendant' } = req.body || {};
  if (!name?.trim() || !username?.trim()) throw new HttpError(400, 'Name and username are required');
  if (!password || password.length < 6) throw new HttpError(400, 'Password must be at least 6 characters');
  if (!ROLES.includes(role)) throw new HttpError(400, 'Invalid role');

  try {
    const { rows } = await query(
      `INSERT INTO users (name, username, password_hash, role) VALUES ($1, $2, $3, $4)
       RETURNING id, name, username, role, active, created_at`,
      [name.trim(), username.trim().toLowerCase(), await bcrypt.hash(password, 10), role]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') throw new HttpError(409, 'That username is already taken');
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

  const { rows } = await query(
    `UPDATE users SET
       name = COALESCE($2, name),
       role = COALESCE($3, role),
       active = COALESCE($4, active),
       password_hash = COALESCE($5, password_hash)
     WHERE id = $1
     RETURNING id, name, username, role, active, created_at`,
    [id, name?.trim() || null, role ?? null, active ?? null, password ? await bcrypt.hash(password, 10) : null]
  );
  if (!rows[0]) throw new HttpError(404, 'User not found');
  res.json(rows[0]);
}));

export default router;
