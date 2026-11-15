import { useCallback, useEffect, useState } from 'react';
import { api, money, localDate, formatDateTime, PAY_LABEL } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import Receipt from './Receipt.jsx';

export default function Sales() {
  const { isAdmin } = useAuth();
  const [from, setFrom] = useState(localDate());
  const [to, setTo] = useState(localDate());
  const [sales, setSales] = useState([]);
  const [open, setOpen] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api(`/sales?from=${from}&to=${to}`).then(setSales).catch((e) => setError(e.message));
  }, [from, to]);
  useEffect(load, [load]);

  const view = async (id) => {
    try {
      setOpen(await api(`/sales/${id}`));
    } catch (e) {
      setError(e.message);
    }
  };

  const voidSale = async () => {
    const reason = window.prompt('Why is this sale being voided? (Stock will be put back.)');
    if (!reason?.trim()) return;
    try {
      setOpen(await api(`/sales/${open.id}/void`, { method: 'POST', body: { reason } }));
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  const valid = sales.filter((s) => !s.voided_at);
  const total = valid.reduce((s, x) => s + x.total, 0);

  return (
    <div>
      <div className="page-head">
        <h1>{isAdmin ? 'Sales' : 'My sales'}</h1>
      </div>
      <div className="filters">
        <label>From <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label>To <input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <span className="muted">
          {valid.length} sale{valid.length === 1 ? '' : 's'} · <strong>{money(total)}</strong>
        </span>
      </div>
      {error && <div className="alert error">{error}</div>}

      <div className="card table-wrap">
        <table className="clickable">
          <thead>
            <tr>
              <th>#</th>
              <th>Time</th>
              {isAdmin && <th>Served by</th>}
              <th>Customer</th>
              <th>Payment</th>
              <th className="num">Items</th>
              <th className="num">Total</th>
            </tr>
          </thead>
          <tbody>
            {sales.length === 0 && <tr><td colSpan={7} className="muted">No sales in this period.</td></tr>}
            {sales.map((s) => (
              <tr key={s.id} onClick={() => view(s.id)} className={s.voided_at ? 'inactive' : ''}>
                <td>{s.id}</td>
                <td>{formatDateTime(s.created_at)}</td>
                {isAdmin && <td>{s.seller_name}</td>}
                <td>{s.customer_name || '—'}</td>
                <td>{PAY_LABEL[s.payment_method] || s.payment_method}</td>
                <td className="num">{s.item_count}</td>
                <td className="num">
                  {s.voided_at ? <span className="badge danger">Voided</span> : money(s.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <Receipt
          sale={open}
          onClose={() => setOpen(null)}
          actions={isAdmin && !open.voided_at && <button className="btn danger" onClick={voidSale}>Void sale</button>}
        />
      )}
    </div>
  );
}
