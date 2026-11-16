import { useState } from 'react';
import { useLicence, whatsappLink } from '../LicenceContext.jsx';
import { useSettings } from '../SettingsContext.jsx';
import { PharmacyIcon, KeyIcon, CopyIcon, WhatsAppIcon, CallIcon, CheckCircleIcon } from '../Icons.jsx';

const MESSAGES = {
  missing: 'This computer has not been activated yet.',
  invalid: 'The saved licence key is not valid. Please enter a new key.',
  wrong_machine: 'The licence key on this computer belongs to a different computer. Please ask for a key for this one.',
};

/** Copy text, falling back for browsers that block the clipboard on plain http (e.g. other PCs on the Wi-Fi). */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

export function MachineId({ id }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="machine-id">
      <code>{id}</code>
      <button type="button" className="btn small with-icon" onClick={async () => {
        if (await copyText(id)) {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      }}>
        {copied ? <><CheckCircleIcon size={15} /> Copied</> : <><CopyIcon size={15} /> Copy</>}
      </button>
    </div>
  );
}

/** Paste-a-key form, used here and on the Settings page for renewals. */
export function KeyForm({ buttonLabel = 'Activate', onDone }) {
  const { activate } = useLicence();
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await activate(key);
      setKey('');
      onDone?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="key-form">
      {error && <div className="alert error">{error}</div>}
      <label>
        Licence key
        <textarea value={key} onChange={(e) => setKey(e.target.value)} rows={4} placeholder="Paste the key here (it starts with SAV1-)" required spellCheck={false} />
      </label>
      <button className="btn primary with-icon" disabled={busy || !key.trim()}>
        <KeyIcon size={18} /> {busy ? 'Checking…' : buttonLabel}
      </button>
    </form>
  );
}

export default function Activate() {
  const { licence } = useLicence();
  const { settings } = useSettings();
  const c = licence.contact;

  return (
    <div className="center login-page">
      <div className="card activate">
        <div className="login-logo"><PharmacyIcon size={34} /></div>
        <h1>Activate {settings.shop_name}</h1>
        <p className="muted center-text">{MESSAGES[licence.state]}</p>

        <ol className="steps">
          <li>
            <strong>Send this computer's ID to {c.name}</strong>
            <MachineId id={licence.machineId} />
            <div className="contact-buttons">
              <a className="btn with-icon whatsapp" href={whatsappLink(licence, settings.shop_name)} target="_blank" rel="noreferrer">
                <WhatsAppIcon size={18} /> Send on WhatsApp
              </a>
              <a className="btn with-icon" href={`tel:${c.phone}`}><CallIcon size={17} /> Call {c.phone}</a>
            </div>
          </li>
          <li>
            <strong>Paste the licence key you receive</strong>
            <KeyForm />
          </li>
        </ol>

        <p className="login-foot muted">© {new Date().getFullYear()} {c.name} · {c.website}</p>
      </div>
    </div>
  );
}
