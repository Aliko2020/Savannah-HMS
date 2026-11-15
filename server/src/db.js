import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';

// The whole database is this one file. Copy it to back up your data.
const serverDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbFile = path.resolve(serverDir, process.env.DB_FILE || 'data/savannah.db');
export const dataDir = path.dirname(dbFile);
fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(dbFile);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');

// SQLite stores true/false as 1/0; turn these back into booleans for the app.
const BOOL_COLUMNS = ['active', 'requires_prescription'];
function toRow(row) {
  if (!row) return row;
  const out = { ...row };
  for (const c of BOOL_COLUMNS) if (c in out) out[c] = Boolean(out[c]);
  return out;
}
// SQLite can't store JS booleans or undefined directly.
const toParam = (v) => (v === true ? 1 : v === false ? 0 : v === undefined ? null : v);

/** All matching rows. */
export const all = (sql, ...params) => db.prepare(sql).all(...params.map(toParam)).map(toRow);
/** First matching row, or undefined. */
export const get = (sql, ...params) => toRow(db.prepare(sql).get(...params.map(toParam)));
/** Run an INSERT/UPDATE/DELETE. Returns { changes, lastInsertRowid }. */
export const run = (sql, ...params) => db.prepare(sql).run(...params.map(toParam));

/**
 * Run fn() as one transaction: either every change is saved, or none are.
 * fn must be synchronous (node:sqlite is), so no other request can run in the middle.
 */
export function transaction(fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

/** Today's date on this computer's clock, as YYYY-MM-DD. */
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Current time on this computer's clock, as YYYY-MM-DDTHH:MM:SS. */
export const now = () => get(`SELECT strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime') AS t`).t;

export const round2 = (n) => Math.round(n * 100) / 100;

export const isUniqueError = (err) => /UNIQUE constraint failed/.test(err?.message || '');

/** Create tables and the first admin account if the database is empty. */
export function initDb() {
  db.exec(fs.readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));

  if (get('SELECT COUNT(*) AS n FROM users').n === 0) {
    const username = (process.env.ADMIN_USERNAME || 'admin').toLowerCase();
    const password = process.env.ADMIN_PASSWORD || 'admin123';
    run(
      `INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, 'admin')`,
      'Shop Owner', username, bcrypt.hashSync(password, 10)
    );
    console.log(`Created first admin account "${username}". Log in and change the password.`);
  }
  console.log(`Database: ${dbFile}`);
}
