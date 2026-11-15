import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, money, localDate } from '../api.js';

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localDate(d);
};

const RANGES = {
  today: ['Today', () => [localDate(), localDate()]],
  week: ['Last 7 days', () => [daysAgo(6), localDate()]],
  month: ['Last 30 days', () => [daysAgo(29), localDate()]],
};

export default function Dashboard() {
  const [range, setRange] = useState('today');
  const [summary, setSummary] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const [from, to] = RANGES[range][1]();
    api(`/reports/summary?from=${from}&to=${to}`).then(setSummary).catch((e) => setError(e.message));
  }, [range]);

  useEffect(() => {
    api('/reports/alerts').then(setAlerts).catch((e) => setError(e.message));
  }, []);

  const maxDay = Math.max(1, ...(summary?.byDay || []).map((d) => d.revenue));

  return (
    <div>
      <div className="page-head">
        <h1>Dashboard</h1>
        <div className="tabs">
          {Object.entries(RANGES).map(([k, [label]]) => (
            <button key={k} className={'btn small' + (range === k ? ' primary' : '')} onClick={() => setRange(k)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {error && <div className="alert error">{error}</div>}

      {summary && (
        <>
          <div className="stats">
            <Stat label="Revenue" value={money(summary.revenue)} />
            <Stat label="Profit" value={money(summary.profit)}
              sub={summary.revenue ? `${Math.round((summary.profit / summary.revenue) * 100)}% margin` : ''} />
            <Stat label="Sales" value={summary.salesCount} sub={`${summary.itemsSold} items`} />
            <Stat label="Avg sale" value={money(summary.salesCount ? summary.revenue / summary.salesCount : 0)} />
          </div>

          <div className="grid2">
            {summary.byDay.length > 1 && (
              <div className="card span2">
                <h2>Revenue by day</h2>
                <div className="bars">
                  {summary.byDay.map((d) => (
                    <div key={d.day} className="bar-col" title={`${d.day}: ${money(d.revenue)}`}>
                      <div className="bar" style={{ height: `${(d.revenue / maxDay) * 100}%` }} />
                      <small>{d.day.slice(5)}</small>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="card">
              <h2>Top products</h2>
              <MiniTable
                rows={summary.topProducts}
                cols={[['Product', (r) => r.product_name], ['Qty', (r) => r.quantity, true], ['Profit', (r) => money(r.profit), true]]}
              />
            </div>
            <div className="card">
              <h2>By staff</h2>
              <MiniTable
                rows={summary.bySeller}
                cols={[['Name', (r) => r.name], ['Sales', (r) => r.sales_count, true], ['Revenue', (r) => money(r.revenue), true]]}
              />
              <h2>By payment</h2>
              <MiniTable
                rows={summary.byPayment}
                cols={[['Method', (r) => r.payment_method], ['Sales', (r) => r.sales_count, true], ['Revenue', (r) => money(r.revenue), true]]}
              />
            </div>
          </div>
        </>
      )}

      {alerts && (
        <div className="grid2">
          <div className="card">
            <h2>Low stock <span className="badge warn">{alerts.lowStock.length}</span></h2>
            <MiniTable
              rows={alerts.lowStock}
              empty="Everything is well stocked."
              cols={[['Product', (r) => r.name], ['Left', (r) => r.quantity, true], ['Reorder at', (r) => r.reorder_level, true]]}
            />
          </div>
          <div className="card">
            <h2>
              Expiry <span className="badge danger">{alerts.expired.length} expired</span>{' '}
              <span className="badge warn">{alerts.expiringSoon.length} within {alerts.expiringWithinDays} days</span>
            </h2>
            <MiniTable
              rows={[...alerts.expired.map((r) => ({ ...r, expired: true })), ...alerts.expiringSoon]}
              empty="Nothing expiring soon."
              cols={[
                ['Product', (r) => r.name],
                ['Qty', (r) => r.quantity, true],
                ['Expiry', (r) => <span className={'badge ' + (r.expired ? 'danger' : 'warn')}>{r.expiry_date}</span>],
              ]}
            />
            {alerts.expired.length > 0 && (
              <p className="muted">Remove expired stock from <Link to="/inventory">Inventory</Link> → Stock.</p>
            )}
          </div>
          <div className="card">
            <h2>Stock value</h2>
            <p>At cost: <strong>{money(alerts.stockValue.at_cost)}</strong></p>
            <p>At selling price: <strong>{money(alerts.stockValue.at_retail)}</strong></p>
            <p className="muted">{alerts.stockValue.product_count} active products</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div className="card stat">
      <div className="muted">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <small className="muted">{sub}</small>}
    </div>
  );
}

function MiniTable({ rows, cols, empty = 'No data yet.' }) {
  if (!rows.length) return <p className="muted">{empty}</p>;
  return (
    <table>
      <thead>
        <tr>{cols.map(([h, , num]) => <th key={h} className={num ? 'num' : ''}>{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>{cols.map(([h, fn, num]) => <td key={h} className={num ? 'num' : ''}>{fn(r)}</td>)}</tr>
        ))}
      </tbody>
    </table>
  );
}
