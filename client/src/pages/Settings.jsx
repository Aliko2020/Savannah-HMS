import { useState } from 'react';
import { useSettings } from '../SettingsContext.jsx';
import { receiptHtml } from './Receipt.jsx';
import Backups from './Backups.jsx';

const SAMPLE_SALE = {
  id: 1024,
  created_at: new Date().toISOString(),
  seller_name: 'Attendant',
  customer_name: '',
  payment_method: 'mobile',
  total: 19.5,
  items: [
    { id: 1, product_name: 'Paracetamol 500mg x20', quantity: 2, unit_price: 5 },
    { id: 2, product_name: 'ORS Sachets', quantity: 3, unit_price: 3.17 },
  ],
};

export default function Settings() {
  const { settings, save } = useSettings();
  const [f, setF] = useState(settings);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await save(f);
      setMsg({ text: 'Settings saved.' });
    } catch (err) {
      setMsg({ error: true, text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const preview = receiptHtml({ ...SAMPLE_SALE, total: 19.51 }, f);

  return (
    <div>
      <div className="page-head"><h1>Settings</h1></div>
      <div className="settings-layout">
        <form className="card" onSubmit={submit}>
          <h2>Shop details</h2>
          <p className="muted">Shown at the top of the app and on every receipt.</p>
          {msg && <div className={'alert ' + (msg.error ? 'error' : 'ok')}>{msg.text}</div>}
          <label>Shop name<input value={f.shop_name} onChange={set('shop_name')} maxLength={60} required /></label>
          <label>Phone number<input value={f.phone} onChange={set('phone')} maxLength={40} placeholder="e.g. 024 123 4567" inputMode="tel" /></label>
          <label>Address / location (optional)<input value={f.address} onChange={set('address')} maxLength={120} placeholder="e.g. Tamale, Northern Region" /></label>
          <label>Message at the bottom of receipts<input value={f.receipt_footer} onChange={set('receipt_footer')} maxLength={120} /></label>

          <h2>Receipt printer</h2>
          <label>
            Paper roll width
            <select value={f.paper_width} onChange={set('paper_width')}>
              <option value="80">80 mm (standard)</option>
              <option value="58">58 mm (small)</option>
            </select>
          </label>
          <label>Currency symbol<input value={f.currency} onChange={set('currency')} maxLength={6} required /></label>
          <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button>
        </form>

        <div className="settings-side">
        <Backups />
        <div className="card">
          <h2>Receipt preview</h2>
          <div className="receipt-preview">
            <iframe title="Receipt preview" srcDoc={preview} style={{ width: f.paper_width === '58' ? '58mm' : '80mm', height: '420px' }} />
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
