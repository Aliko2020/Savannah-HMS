import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { get, dataDir } from './db.js';

/**
 * Secret used to sign logins. Uses JWT_SECRET if set; otherwise one is generated
 * once and kept next to the database, so you don't have to set anything up.
 */
function loadSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  const file = path.join(dataDir, '.jwt-secret');
  if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8').trim();
  const secret = crypto.randomBytes(48).toString('hex');
  fs.writeFileSync(file, secret, { mode: 0o600 });
  return secret;
}
const SECRET = loadSecret();

export function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn: '12h' });
}

/** Require a valid token from an active user. Sets req.user. */
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not logged in' });

  try {
    const payload = jwt.verify(token, SECRET);
    // Re-check the database so deactivated users and role changes take effect immediately.
    const user = get('SELECT id, name, username, role, active FROM users WHERE id = ?', payload.id);
    if (!user || !user.active) return res.status(401).json({ error: 'Account disabled' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Session expired, please log in again' });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Owner access only' });
  next();
}

/** Wrap async route handlers so thrown errors reach the error middleware. */
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** Error with an HTTP status, for validation failures. */
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
