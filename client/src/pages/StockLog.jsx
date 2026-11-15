import { useEffect, useState } from 'react';
import { api, formatDateTime } from '../api.js';

const REASON_LABEL = {
  initial: 'Opening stock', restock: 'Restock', sale: 'Sale', void: 'Sale voided',
  adjustment: 'Count correction', expired: 'Expired', damaged: 'Damaged',
};

export default function StockLog() {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api('/products/movements').then(setRows).catch((e) => setError(e.message));
  }, []);

  const shown = filter ? rows.filter((r) => r.product_name.toLowerCase().includes(filter.toLowerCase())) : rows;

  return (
    <div>
      <div className="page-head"><h1>Stock log</h1></div>
      <p className="muted">Every change to stock: sales, deliveries, corrections and write-offs. Showing the latest 300.</p>
      <div className="filters">
        <input placeholder="Filter by product…" value={filter} onChange={(e) => setFilter(e.target.value)} />
      </div>
      {error && <div className="alert error">{error}</div>}
      <div className="card table-wrap">
        <table>
          <thead>
            <tr><th>When</th><th>Product</th><th>Reason</th><th className="num">Change</th><th>By</th><th>Note</th></tr>
          </thead>
          <tbody>
            {shown.length === 0 && <tr><td colSpan={6} className="muted">Nothing yet.</td></tr>}
            {shown.map((r) => (
              <tr key={r.id}>
                <td>{formatDateTime(r.created_at)}</td>
                <td>{r.product_name}</td>
                <td>{REASON_LABEL[r.reason]}{r.sale_id && <small className="muted"> #{r.sale_id}</small>}</td>
                <td className={'num ' + (r.change > 0 ? 'text-ok' : 'text-danger')}>{r.change > 0 ? '+' : ''}{r.change}</td>
                <td>{r.user_name || '—'}</td>
                <td>{r.note || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
