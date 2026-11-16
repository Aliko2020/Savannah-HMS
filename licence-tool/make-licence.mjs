#!/usr/bin/env node
/**
 * Savannah Pharmacy licence-key maker. FOR AMOS ALIKO ONLY - do not give this to shops.
 *
 *   node make-licence.mjs setup              Create your signing keys (run ONCE, ever).
 *   node make-licence.mjs                    Make a licence key (asks the questions).
 *   node make-licence.mjs "<shop>" <machine-id> [months]
 *
 * Your PRIVATE key is kept in your user folder (~/.savannah-licence/), never inside
 * the project, so it is never uploaded to GitHub. Anyone who has it can make keys.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline/promises';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP_PUBLIC_KEY_FILE = path.resolve(HERE, '../server/src/licence-public-key.js');
const SECRET_DIR = process.env.SAVANNAH_LICENCE_DIR || path.join(os.homedir(), '.savannah-licence');
const PRIVATE_KEY_FILE = path.join(SECRET_DIR, 'private-key.pem');
const LOG_FILE = path.join(SECRET_DIR, 'issued-keys.csv');
const DEFAULT_MONTHS = 3;

const say = (s = '') => console.log(s);
const fail = (s) => {
  console.error('\n  ERROR: ' + s + '\n');
  process.exit(1);
};

function appPublicKey() {
  const src = fs.readFileSync(APP_PUBLIC_KEY_FILE, 'utf8');
  const m = src.match(/PUBLIC_KEY = `([\s\S]*?)`/);
  return m ? m[1].trim() : null;
}

// ---------------- setup ----------------
function setup() {
  if (fs.existsSync(PRIVATE_KEY_FILE)) {
    fail(
      `You already have a private key at:\n    ${PRIVATE_KEY_FILE}\n  Making a new one would stop ALL existing licence keys from working, so this was cancelled.`
    );
  }
  if (appPublicKey()) {
    say('\n  NOTE: the app already contains a public key, but there is no private key on this computer.');
    say('  If you set this up on another computer, copy the private-key.pem file from there instead.');
    say('  Continuing will replace the app\'s key, and keys made with the old one will stop working.\n');
  }
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  fs.mkdirSync(SECRET_DIR, { recursive: true });
  fs.writeFileSync(PRIVATE_KEY_FILE, privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 });

  const pub = publicKey.export({ type: 'spki', format: 'pem' }).trim();
  fs.writeFileSync(
    APP_PUBLIC_KEY_FILE,
    `// The public half of the licence signing key. It can CHECK licence keys but cannot
// create them. Written by licence-tool (setup). Do not edit.
export const PUBLIC_KEY = \`${pub}\`;
`
  );

  say('\n  Done! Your licence signing keys are ready.\n');
  say('  1. YOUR PRIVATE KEY (keep it secret, keep a backup):');
  say('       ' + PRIVATE_KEY_FILE);
  say('     Copy this file to a USB stick and keep it somewhere safe.');
  say('     If you lose it, you cannot make keys for existing customers.');
  say('     If someone else gets it, they can make keys. Never send it to anyone.\n');
  say('  2. The app now contains your PUBLIC key. Upload that change to GitHub:');
  say('       git add server/src/licence-public-key.js');
  say('       git commit -m "Add licence public key"');
  say('       git push\n');
  say('  From now on, the app needs a licence key on every computer, including yours.');
  say('  Make one with "Make Licence Key".\n');
}

// ---------------- make a key ----------------
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Today + N months, keeping the day of the month (Nov 30 + 3 months = Feb 28/29). */
function addMonths(date, months) {
  const d = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(date.getDate(), lastDay));
  return d;
}

function normaliseMachineId(id) {
  const hex = String(id || '').toUpperCase().replace(/[^0-9A-F]/g, '');
  if (hex.length !== 16) return null;
  return hex.match(/.{4}/g).join('-');
}

function makeKey(shop, mid, months) {
  if (!fs.existsSync(PRIVATE_KEY_FILE)) fail('No private key found. Run "Setup (run once)" first.');
  const privateKey = crypto.createPrivateKey(fs.readFileSync(PRIVATE_KEY_FILE));

  // Safety check: the private key must match the public key inside the app.
  const pubFromPrivate = crypto.createPublicKey(privateKey).export({ type: 'spki', format: 'pem' }).trim();
  const inApp = appPublicKey();
  if (!inApp) fail('The app has no public key yet. Run "Setup (run once)" first.');
  if (inApp !== pubFromPrivate) {
    fail('Your private key does not match the public key inside the app. Keys made now would NOT work.');
  }

  const now = new Date();
  const details = {
    v: 1,
    shop,
    mid,
    iss: ymd(now),
    exp: ymd(addMonths(now, months)),
    id: crypto.randomBytes(4).toString('hex'),
  };
  const payload = Buffer.from(JSON.stringify(details));
  const sig = crypto.sign(null, payload, privateKey);
  const key = `SAV1-${payload.toString('base64url')}.${sig.toString('base64url')}`;

  if (!crypto.verify(null, payload, crypto.createPublicKey(inApp), sig)) fail('Self-check failed. Key not issued.');

  fs.mkdirSync(SECRET_DIR, { recursive: true });
  if (!fs.existsSync(LOG_FILE)) fs.writeFileSync(LOG_FILE, 'issued,shop,machine_id,expires,key_id,key\n');
  const csv = (s) => `"${String(s).replaceAll('"', '""')}"`;
  fs.appendFileSync(LOG_FILE, [details.iss, csv(shop), mid, details.exp, details.id, key].join(',') + '\n');
  return { key, details };
}

async function interactive() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  say('\n  === Make a Savannah Pharmacy licence key ===\n');
  let shop = '';
  while (!shop) shop = (await rl.question('  Shop name: ')).trim();
  let mid = null;
  while (!mid) {
    mid = normaliseMachineId(await rl.question('  Machine ID (from their activation screen, e.g. 7F3A-91C2-4E8B-A1B2): '));
    if (!mid) say('  That doesn\'t look right. It should be 16 letters/numbers like 7F3A-91C2-4E8B-A1B2.');
  }
  const m = (await rl.question(`  How many months? [${DEFAULT_MONTHS}]: `)).trim();
  const months = m ? parseInt(m, 10) : DEFAULT_MONTHS;
  rl.close();
  if (!Number.isInteger(months) || months < 1 || months > 120) fail('Months must be a number from 1 to 120.');
  return { shop, mid, months };
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === 'setup') return setup();

  let shop, mid, months;
  if (cmd) {
    shop = cmd;
    mid = normaliseMachineId(rest[0]);
    months = rest[1] ? parseInt(rest[1], 10) : DEFAULT_MONTHS;
    if (!mid) fail('Machine ID should look like 7F3A-91C2-4E8B-A1B2.');
  } else {
    ({ shop, mid, months } = await interactive());
  }

  const { key, details } = makeKey(shop, mid, months);
  say('\n  Licence key for ' + details.shop);
  say('  Computer: ' + details.mid + '   Valid until: ' + details.exp + ' (' + months + ' month' + (months === 1 ? '' : 's') + ')\n');
  say(key + '\n');
  if (process.platform === 'win32') {
    try {
      execSync('clip', { input: key });
      say('  The key has been COPIED. Paste it into WhatsApp/SMS for the shop.');
    } catch {
      say('  Copy the key above and send it to the shop.');
    }
  }
  say('  A record was saved in: ' + LOG_FILE + '\n');
}

main().catch((e) => fail(e.message));
