import { useEffect, useState } from 'react';
import { api, formatDateTime } from '../api.js';
import { SaveIcon, FolderIcon, CheckCircleIcon, AlertIcon } from '../Icons.jsx';

const size = (b) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

function ago(iso) {
  const mins = Math.round((Date.now() - new Date(iso)) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

/** Owner-only panel: where backups go, the latest ones, and a "Back up now" button. */
export default function Backups() {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    api('/backups').then(setData).catch((e) => setMsg({ error: true, text: e.message }));
  }, []);

  const backupNow = async () => {
    setBusy(true);
    setMsg(null);
    try {
      setData(await api('/backups', { method: 'POST' }));
      setMsg({ text: 'Backup saved.' });
    } catch (e) {
      setMsg({ error: true, text: e.message });
    } finally {
      setBusy(false);
    }
  };

  const latest = data?.backups[0];
  const stale = latest && Date.now() - new Date(latest.created) > 2 * 864e5;

  return (
    <div className="card backups">
      <h2>Backups</h2>
      <p className="muted small-top">
        The app saves a copy of all your data when it starts, every 3 hours while it's open, and when it's closed.
      </p>
      {msg && <div className={'alert ' + (msg.error ? 'error' : 'ok')}>{msg.text}</div>}
      {data && (
        <>
          <div className={'backup-status ' + (!latest || stale ? 'bad' : 'good')}>
            {!latest || stale ? <AlertIcon size={20} /> : <CheckCircleIcon size={20} />}
            <span>
              {latest ? <>Last backup <strong>{ago(latest.created)}</strong></> : <strong>No backups yet</strong>}
              <small>{data.backups.length} saved</small>
            </span>
          </div>
          <div className="backup-folder" title={data.folder}>
            <FolderIcon size={16} />
            <code>{data.folder}</code>
          </div>
          <button className="btn primary with-icon" onClick={backupNow} disabled={busy}>
            <SaveIcon size={18} /> {busy ? 'Backing up…' : 'Back up now'}
          </button>
          {data.backups.length > 0 && (
            <ul className="backup-list">
              {data.backups.slice(0, 5).map((b) => (
                <li key={b.name}>
                  <span>{formatDateTime(b.created)}</span>
                  <small className="muted">{size(b.size)}</small>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
