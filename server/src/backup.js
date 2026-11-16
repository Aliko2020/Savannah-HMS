import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { db } from './db.js';

const KEEP = Number(process.env.BACKUP_KEEP) || 60; // how many backups to keep
const CHECK_MS = 60 * 60 * 1000; // look every hour
const EVERY_MS = 3 * 60 * 60 * 1000; // back up every 3 hours if anything changed
const MIN_GAP_MS = 10 * 60 * 1000; // don't back up again if one was made in the last 10 minutes
const PREFIX = 'savannah-';

/**
 * Where backups go. BACKUP_DIR in server/.env wins; otherwise a "Savannah Backups"
 * folder on the Desktop. On Windows the Desktop is sometimes inside OneDrive.
 */
function findBackupDir() {
  if (process.env.BACKUP_DIR) return path.resolve(process.env.BACKUP_DIR);
  const home = os.homedir();
  const candidates = [path.join(home, 'Desktop'), path.join(home, 'OneDrive', 'Desktop')];
  const desktop = candidates.find((d) => fs.existsSync(d)) || home;
  return path.join(desktop, 'Savannah Backups');
}

export const backupDir = findBackupDir();

const stamp = (d = new Date()) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
};

/** All backups, newest first. */
export function listBackups() {
  if (!fs.existsSync(backupDir)) return [];
  return fs
    .readdirSync(backupDir)
    .filter((f) => f.startsWith(PREFIX) && f.endsWith('.db'))
    .map((name) => {
      const st = fs.statSync(path.join(backupDir, name));
      return { name, size: st.size, created: st.mtime.toISOString() };
    })
    .sort((a, b) => b.created.localeCompare(a.created));
}

/**
 * Save a full copy of the database. VACUUM INTO writes a consistent snapshot even
 * while the app is being used, so a backup is never half-written.
 */
export function backupNow(reason = 'manual') {
  fs.mkdirSync(backupDir, { recursive: true });
  const file = path.join(backupDir, `${PREFIX}${stamp()}.db`);
  const tmp = file + '.partial';
  if (fs.existsSync(tmp)) fs.rmSync(tmp);
  db.exec(`VACUUM INTO '${tmp.replaceAll("'", "''")}'`);
  fs.renameSync(tmp, file); // only a finished backup gets the .db name
  changesAtLastBackup = totalChanges();
  prune();
  console.log(`Backup saved (${reason}): ${file}`);
  return listBackups()[0];
}

// Count of rows changed since the app started, to tell whether anything new needs saving.
const totalChanges = () => db.prepare('SELECT total_changes() AS n').get().n;
let changesAtLastBackup = -1; // -1 = no backup made since the app started

function prune() {
  for (const old of listBackups().slice(KEEP)) {
    fs.rmSync(path.join(backupDir, old.name), { force: true });
  }
}

function lastBackupTime() {
  const latest = listBackups()[0];
  return latest ? new Date(latest.created) : null;
}

/** Back up unless one was made very recently. Never crashes the app. */
function safeBackup(reason, { scheduled = false, ifChanged = false } = {}) {
  try {
    const last = lastBackupTime();
    const changed = changesAtLastBackup === -1 || totalChanges() !== changesAtLastBackup;
    if (ifChanged) {
      // Closing: save anything new since the last backup, however recent that was.
      if (last && !changed) return;
      return void backupNow(reason);
    }
    if (last && Date.now() - last.getTime() < MIN_GAP_MS) return;
    if (scheduled && last) {
      const doneToday = last.toDateString() === new Date().toDateString();
      const due = Date.now() - last.getTime() >= EVERY_MS;
      // At least one backup a day; more often only when there's something new to save.
      if (doneToday && !(changed && due)) return;
    }
    backupNow(reason);
  } catch (err) {
    console.error(`Backup failed (${reason}): ${err.message}`);
  }
}

/**
 * Back up when the app starts, every 3 hours while it runs (if anything changed,
 * and at least once a day), and when it is closed with Ctrl+C.
 */
export function startAutoBackup() {
  if (process.env.BACKUP_DISABLED === '1') return;
  console.log(`Backups folder: ${backupDir}`);
  safeBackup('startup');
  setInterval(() => safeBackup('scheduled', { scheduled: true }), CHECK_MS).unref();

  let closing = false;
  const onExit = (signal) => {
    if (closing) return;
    closing = true;
    safeBackup('closing', { ifChanged: true });
    process.exit(signal === 'SIGINT' ? 130 : 0);
  };
  process.on('SIGINT', () => onExit('SIGINT')); // Ctrl+C
  process.on('SIGTERM', () => onExit('SIGTERM'));
  process.on('SIGHUP', () => onExit('SIGHUP')); // terminal window closed
}
