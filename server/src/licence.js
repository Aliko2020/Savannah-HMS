import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { PUBLIC_KEY } from './licence-public-key.js';
import { dataDir, get, run, today } from './db.js';

/**
 * Licence keys
 * ------------
 * A key is "SAV1-" + base64url(JSON details) + "." + base64url(signature).
 * The details say which shop and which computer (machine ID) it is for, and until
 * when it is valid. The signature is made with the developer's PRIVATE key, which
 * never leaves the developer's computer; the app only has the PUBLIC key, which can
 * check a signature but cannot make one. So nobody else can create or edit keys.
 */

export const CONTACT = {
  name: 'Amos Aliko',
  phone: '0507363607',
  whatsapp: '233507363607', // international format for WhatsApp links (Ghana +233)
  website: 'edusavannah.com',
};

const KEY_FILE = path.join(dataDir, 'licence.key');
const PREFIX = 'SAV1-';
export const REMIND_DAYS = 14;

// ---------- Machine ID ----------

function rawMachineId() {
  try {
    if (process.platform === 'win32') {
      // Windows' own installation ID. /reg:64 reads the right place even from 32-bit Node.
      const out = execFileSync('reg', ['query', 'HKLM\\SOFTWARE\\Microsoft\\Cryptography', '/v', 'MachineGuid', '/reg:64'], {
        encoding: 'utf8',
        windowsHide: true,
      });
      const m = out.match(/MachineGuid\s+REG_SZ\s+(\S+)/i);
      if (m) return m[1];
    } else if (process.platform === 'darwin') {
      const out = execFileSync('ioreg', ['-rd1', '-c', 'IOPlatformExpertDevice'], { encoding: 'utf8' });
      const m = out.match(/"IOPlatformUUID" = "([^"]+)"/);
      if (m) return m[1];
    } else {
      for (const f of ['/etc/machine-id', '/var/lib/dbus/machine-id']) {
        if (fs.existsSync(f)) {
          const id = fs.readFileSync(f, 'utf8').trim();
          if (id) return id;
        }
      }
    }
  } catch {
    // fall through to the backup method below
  }
  // Backup: computer name + network card addresses.
  const macs = Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i && !i.internal && i.mac && i.mac !== '00:00:00:00:00:00')
    .map((i) => i.mac)
    .sort();
  return `${os.hostname()}|${[...new Set(macs)].join(',')}`;
}

let cachedMachineId;
/** A short, readable ID for this computer, e.g. 7F3A-91C2-4E8B-A1B2. */
export function machineId() {
  if (!cachedMachineId) {
    const hash = crypto.createHash('sha256').update('savannah-hms|' + rawMachineId()).digest('hex').slice(0, 16).toUpperCase();
    cachedMachineId = hash.match(/.{4}/g).join('-');
  }
  return cachedMachineId;
}

// ---------- Reading and checking keys ----------

/** Check a key's signature and return its details, or null if it is not genuine. */
export function readKey(key) {
  if (!PUBLIC_KEY) return null;
  // Keys sent over WhatsApp/SMS can pick up spaces or line breaks; remove them.
  const clean = String(key || '').replace(/\s+/g, '');
  if (!clean.startsWith(PREFIX)) return null;
  const [payloadPart, sigPart] = clean.slice(PREFIX.length).split('.');
  if (!payloadPart || !sigPart) return null;
  try {
    const payload = Buffer.from(payloadPart, 'base64url');
    const ok = crypto.verify(null, payload, crypto.createPublicKey(PUBLIC_KEY), Buffer.from(sigPart, 'base64url'));
    if (!ok) return null;
    const details = JSON.parse(payload.toString('utf8'));
    if (details.v !== 1 || !details.mid || !/^\d{4}-\d{2}-\d{2}$/.test(details.exp || '')) return null;
    return { ...details, key: clean };
  } catch {
    return null;
  }
}

/**
 * The date used for expiry. If someone winds the PC clock back to stretch a
 * licence, we still use the latest date the app has seen.
 */
function licenceToday() {
  const now = today();
  const seen = get(`SELECT value FROM settings WHERE key = 'licence_last_seen'`)?.value;
  const effective = seen && seen > now ? seen : now;
  if (!seen || now > seen) {
    run(
      `INSERT INTO settings (key, value) VALUES ('licence_last_seen', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      now
    );
  }
  return effective;
}

const daysBetween = (from, to) => Math.round((new Date(to + 'T00:00:00') - new Date(from + 'T00:00:00')) / 864e5);

/**
 * The licence state of this computer:
 *   disabled      - licensing not set up yet (no public key in the app): everything works
 *   missing       - no key entered yet
 *   invalid       - the saved key is not genuine
 *   wrong_machine - the key is for a different computer
 *   expired       - the key's end date has passed: data can be viewed, no new sales
 *   valid         - all good
 */
export function licenceStatus() {
  const base = { machineId: machineId(), contact: CONTACT, remindDays: REMIND_DAYS };
  if (!PUBLIC_KEY) return { ...base, state: 'disabled' };
  if (!fs.existsSync(KEY_FILE)) return { ...base, state: 'missing' };

  const details = readKey(fs.readFileSync(KEY_FILE, 'utf8'));
  if (!details) return { ...base, state: 'invalid' };
  if (details.mid !== base.machineId) return { ...base, state: 'wrong_machine', shop: details.shop };

  const now = licenceToday();
  const daysLeft = daysBetween(now, details.exp) + 1; // valid through the whole of the end date
  return {
    ...base,
    state: daysLeft > 0 ? 'valid' : 'expired',
    shop: details.shop,
    issued: details.iss,
    expires: details.exp,
    daysLeft: Math.max(daysLeft, 0),
  };
}

/** Save a new key after checking it is genuine, for this computer and not expired. */
export function activate(key) {
  if (!PUBLIC_KEY) return { ok: false, error: 'Licensing is not set up in this copy of the app.' };
  const details = readKey(key);
  if (!details) return { ok: false, error: 'This key is not valid. Check that you copied all of it.' };
  if (details.mid !== machineId()) {
    return { ok: false, error: `This key is for a different computer (${details.mid}). This computer's ID is ${machineId()}.` };
  }
  if (details.exp < licenceToday()) return { ok: false, error: `This key expired on ${details.exp}. Please ask for a new one.` };
  fs.writeFileSync(KEY_FILE, details.key + '\n');
  return { ok: true, status: licenceStatus() };
}

/** States in which the app is fully locked (only the activation screen works). */
export const LOCKED_STATES = ['missing', 'invalid', 'wrong_machine'];
