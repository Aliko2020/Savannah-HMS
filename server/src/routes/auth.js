import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { get, run } from '../db.js';
import { asyncHandler, requireAuth, signToken, HttpError } from '../auth.js';

const router = Router();

router.post('/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) throw new HttpError(400, 'Username and password are required');

  const user = get('SELECT * FROM users WHERE username = ?', String(username).trim().toLowerCase());
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new HttpError(401, 'Wrong username or password');
  }
  if (!user.active) throw new HttpError(401, 'This account has been disabled');

  res.json({
    token: signToken(user),
    user: { id: user.id, name: user.name, username: user.username, role: user.role },
  });
}));

router.get('/me', requireAuth, (req, res) => {
  const { id, name, username, role } = req.user;
  res.json({ id, name, username, role });
});

router.post('/change-password', requireAuth, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!newPassword || newPassword.length < 6) throw new HttpError(400, 'New password must be at least 6 characters');

  const { password_hash } = get('SELECT password_hash FROM users WHERE id = ?', req.user.id);
  if (!(await bcrypt.compare(currentPassword || '', password_hash))) {
    throw new HttpError(400, 'Current password is wrong');
  }
  run('UPDATE users SET password_hash = ? WHERE id = ?', await bcrypt.hash(newPassword, 10), req.user.id);
  res.json({ ok: true });
}));

export default router;
