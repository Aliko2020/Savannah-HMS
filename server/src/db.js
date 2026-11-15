import fs from 'node:fs';
import pg from 'pg';
import bcrypt from 'bcryptjs';

// Return NUMERIC columns as JS numbers instead of strings.
pg.types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v)));
// Return DATE columns as 'YYYY-MM-DD' strings (avoids timezone shifts).
pg.types.setTypeParser(1082, (v) => v);

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set. Copy server/.env.example to server/.env and fill it in.');
  process.exit(1);
}

const isLocal = /localhost|127\.0\.0\.1/.test(connectionString);
export const pool = new pg.Pool({
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false },
  max: 5,
});

// The shop's local timezone, so "today" and daily reports match the shop's clock.
export const TIMEZONE = process.env.APP_TIMEZONE || 'UTC';
try {
  new Intl.DateTimeFormat('en', { timeZone: TIMEZONE });
} catch {
  console.error(`APP_TIMEZONE "${TIMEZONE}" is not a valid timezone (example: Africa/Nairobi)`);
  process.exit(1);
}
pool.on('connect', (client) => client.query(`SET TIME ZONE '${TIMEZONE}'`));

/** Today's date in the shop's timezone, as YYYY-MM-DD. */
export const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(new Date());

export const query = (text, params) => pool.query(text, params);

/** Run fn(client) inside a transaction. */
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Create tables and the first admin account if the database is empty. */
export async function initDb() {
  const schema = fs.readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');
  await pool.query(schema);

  const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM users');
  if (rows[0].n === 0) {
    const username = process.env.ADMIN_USERNAME || 'admin';
    const password = process.env.ADMIN_PASSWORD || 'admin123';
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      `INSERT INTO users (name, username, password_hash, role) VALUES ($1, $2, $3, 'admin')`,
      ['Shop Owner', username, hash]
    );
    console.log(`Created first admin account "${username}". Log in and change the password.`);
  }
}
