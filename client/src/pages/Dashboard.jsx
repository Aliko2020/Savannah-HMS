import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, money, localDate, PAY_LABEL } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import {
  BanknoteIcon, TrendUpIcon, ReceiptIcon, ScaleIcon, TrophyIcon, UsersIcon, WalletIcon, PhoneIcon,
  AlertIcon, CalendarIcon, BoxIcon, CheckCircleIcon, ChartIcon, CartIcon,
} from '../Icons.jsx';

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localDate(d);
};

const RANGES = {
  today: ['Today', () => [localDate(), localDate()]],
  week: ['7 days', () => [daysAgo(6), localDate()]],
  month: ['30 days', () => [daysAgo(29), localDate()]],
};

// Validated pair (distinct for colour-blind viewers, >= 3:1 on white).
const PAY_COLOR = { cash: '#0e9a83', mobile: '#eb6834' };
const PAY_ICON = { cash: BanknoteIcon, mobile: PhoneIcon };

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

/** Every day in the range, so days with no sales show as empty instead of disappearing. */
function fillDays(from, to, rows) {
  const byDay = Object.fromEntries(rows.map((r) => [r.day, r]));
  const out = [];
  for (let d = new Date(from + 'T00:00:00'); localDate(d) <= to; d.setDate(d.getDate() + 1)) {
    const key = localDate(d);
    out.push(byDay[key] || { day: key, revenue: 0, sales_count: 0 });
  }
  return out;
}

export default function Dashboard() {
  const { user } = useAuth();
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

  const margin = summary?.revenue ? Math.round((summary.profit / summary.revenue) * 100) : null;
  const rangeLabel = range === 'today' ? 'today' : `in the last ${RANGES[range][0]}`;

  return (
    <div className="dash">
      <div className="dash-head">
        <div>
          <h1>{greeting()}, {user.name}</h1>
          <p className="muted dash-date">
            <CalendarIcon size={15} />
            {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="dash-actions">
          <div className="segmented" role="tablist" aria-label="Date range">
            {Object.entries(RANGES).map(([k, [label]]) => (
              <button key={k} role="tab" aria-selected={range === k} className={range === k ? 'on' : ''} onClick={() => setRange(k)}>
                {label}
              </button>
            ))}
          </div>
          <Link to="/sell" className="btn primary with-icon"><CartIcon size={18} /> New sale</Link>
        </div>
      </div>
      {error && <div className="alert error">{error}</div>}

      {summary && (
        <>
          <div className="stats">
            <Stat icon={BanknoteIcon} tone="teal" label="Revenue" value={money(summary.revenue)} sub={`Sales ${rangeLabel}`} />
            <Stat icon={TrendUpIcon} tone="green" label="Profit" value={money(summary.profit)}
              sub={margin === null ? 'No sales yet' : `${margin}% margin`} />
            <Stat icon={ReceiptIcon} tone="blue" label="Sales" value={summary.salesCount}
              sub={`${summary.itemsSold} item${summary.itemsSold === 1 ? '' : 's'} sold`} />
            <Stat icon={ScaleIcon} tone="violet" label="Average sale"
              value={money(summary.salesCount ? summary.revenue / summary.salesCount : 0)} sub="Per customer" />
          </div>

          <div className="dash-grid">
            <Panel icon={ChartIcon} title="Revenue by day" className="span2">
              {range === 'today'
                ? <Empty icon={ChartIcon} text="Choose 7 days or 30 days to see the daily trend." />
                : <DayBars days={fillDays(summary.from, summary.to, summary.byDay)} />}
            </Panel>

            <Panel icon={WalletIcon} title="How customers paid">
              <PaymentSplit rows={summary.byPayment} />
            </Panel>
          </div>

          <div className="dash-grid two">
            <Panel icon={TrophyIcon} title="Best sellers">
              <TopProducts rows={summary.topProducts} />
            </Panel>

            <Panel icon={UsersIcon} title="Sales by staff">
              {summary.bySeller.length === 0 ? <Empty icon={UsersIcon} text="No sales yet." /> : (
                <ul className="staff-list">
                  {summary.bySeller.map((s) => (
                    <li key={s.name}>
                      <span className="avatar">{s.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}</span>
                      <span className="grow"><strong>{s.name}</strong><small className="muted">{s.sales_count} sale{s.sales_count === 1 ? '' : 's'}</small></span>
                      <span className="num">{money(s.revenue)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </>
      )}

      {alerts && (
        <>
          <h2 className="section-title">Needs attention</h2>
          <div className="dash-grid three">
            <Panel icon={AlertIcon} tone="warn" title="Low stock" count={alerts.lowStock.length}>
              {alerts.lowStock.length === 0 ? <Empty ok text="Everything is well stocked." /> : (
                <ul className="alert-list">
                  {alerts.lowStock.map((p) => (
                    <li key={p.id}>
                      <span className="grow">{p.name}<small className="muted">Reorder at {p.reorder_level}</small></span>
                      <span className={'pill ' + (p.quantity === 0 ? 'critical' : 'warn')}>{p.quantity === 0 ? 'Out of stock' : `${p.quantity} left`}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel icon={CalendarIcon} tone="critical" title="Expiry" count={alerts.expired.length + alerts.expiringSoon.length}>
              {alerts.expired.length + alerts.expiringSoon.length === 0 ? <Empty ok text={`Nothing expires in the next ${alerts.expiringWithinDays} days.`} /> : (
                <>
                  <ul className="alert-list">
                    {alerts.expired.map((p) => (
                      <li key={p.id}>
                        <span className="grow">{p.name}<small className="muted">{p.quantity} in stock</small></span>
                        <span className="pill critical"><AlertIcon size={13} /> Expired {p.expiry_date}</span>
                      </li>
                    ))}
                    {alerts.expiringSoon.map((p) => (
                      <li key={p.id}>
                        <span className="grow">{p.name}<small className="muted">{p.quantity} in stock</small></span>
                        <span className="pill warn">{daysUntil(p.expiry_date)}</span>
                      </li>
                    ))}
                  </ul>
                  {alerts.expired.length > 0 && (
                    <p className="muted small">Remove expired stock from <Link to="/inventory">Inventory</Link> → Stock.</p>
                  )}
                </>
              )}
            </Panel>

            <Panel icon={BoxIcon} tone="blue" title="Stock value">
              <div className="value-rows">
                <div><span className="muted">At cost</span><strong>{money(alerts.stockValue.at_cost)}</strong></div>
                <div><span className="muted">At selling price</span><strong>{money(alerts.stockValue.at_retail)}</strong></div>
                <div><span className="muted">Possible profit</span><strong>{money(alerts.stockValue.at_retail - alerts.stockValue.at_cost)}</strong></div>
              </div>
              <p className="muted small">{alerts.stockValue.product_count} products in stock list</p>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}

function daysUntil(date) {
  const days = Math.round((new Date(date + 'T00:00:00') - new Date(localDate() + 'T00:00:00')) / 864e5);
  return days === 0 ? 'Expires today' : `${days} day${days === 1 ? '' : 's'} left`;
}

function Stat({ icon: Icon, tone, label, value, sub }) {
  return (
    <div className="card stat">
      <span className={`stat-icon ${tone}`}><Icon size={22} /></span>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {sub && <small className="muted">{sub}</small>}
      </div>
    </div>
  );
}

function Panel({ icon: Icon, title, tone = 'teal', count, className = '', children }) {
  return (
    <section className={`card panel ${className}`}>
      <h2 className="panel-title">
        <span className={`panel-icon ${tone}`}><Icon size={17} /></span>
        {title}
        {count > 0 && <span className={`count ${tone}`}>{count}</span>}
      </h2>
      {children}
    </section>
  );
}

function Empty({ icon: Icon = CheckCircleIcon, text, ok }) {
  return (
    <div className={'empty' + (ok ? ' ok' : '')}>
      {ok ? <CheckCircleIcon size={22} /> : <Icon size={22} />}
      <span>{text}</span>
    </div>
  );
}

function DayBars({ days }) {
  const max = Math.max(...days.map((d) => d.revenue));
  if (max === 0) return <Empty icon={ChartIcon} text="No sales in this period yet." />;
  const showEvery = days.length > 14 ? 5 : 1; // keep axis labels readable on 30 days
  return (
    <div className="daybars" role="img" aria-label="Revenue per day">
      {days.map((d, i) => {
        const date = new Date(d.day + 'T00:00:00');
        return (
          <div key={d.day} className="daybar" tabIndex={0}>
            <div className="daybar-track">
              <div className="daybar-fill" style={{ height: `${(d.revenue / max) * 100}%` }} />
            </div>
            <span className="daybar-label">
              {i % showEvery === 0 ? date.toLocaleDateString(undefined, days.length > 7 ? { day: 'numeric', month: 'short' } : { weekday: 'short' }) : ''}
            </span>
            <span className="tip">
              <strong>{date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</strong>
              {money(d.revenue)} · {d.sales_count} sale{d.sales_count === 1 ? '' : 's'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function PaymentSplit({ rows }) {
  const total = rows.reduce((s, r) => s + r.revenue, 0);
  if (!total) return <Empty icon={WalletIcon} text="No payments yet." />;
  const methods = ['cash', 'mobile'].map((m) => rows.find((r) => r.payment_method === m) || { payment_method: m, revenue: 0, sales_count: 0 });
  return (
    <>
      <div className="split-bar" aria-hidden="true">
        {methods.filter((m) => m.revenue > 0).map((m) => (
          <span key={m.payment_method} style={{ width: `${(m.revenue / total) * 100}%`, background: PAY_COLOR[m.payment_method] }} />
        ))}
      </div>
      <ul className="split-legend">
        {methods.map((m) => {
          const Icon = PAY_ICON[m.payment_method];
          return (
            <li key={m.payment_method}>
              <span className="swatch" style={{ background: PAY_COLOR[m.payment_method] }} />
              <Icon size={16} />
              <span className="grow">{PAY_LABEL[m.payment_method]}<small className="muted">{m.sales_count} sale{m.sales_count === 1 ? '' : 's'}</small></span>
              <span className="num"><strong>{money(m.revenue)}</strong><small className="muted">{Math.round((m.revenue / total) * 100)}%</small></span>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function TopProducts({ rows }) {
  if (!rows.length) return <Empty icon={TrophyIcon} text="No sales yet." />;
  const max = rows[0].quantity;
  return (
    <ol className="rank-list">
      {rows.slice(0, 6).map((r, i) => (
        <li key={r.product_name}>
          <span className="rank">{i + 1}</span>
          <span className="grow">
            <span className="rank-name">{r.product_name}</span>
            <span className="rank-bar"><span style={{ width: `${(r.quantity / max) * 100}%` }} /></span>
          </span>
          <span className="num"><strong>{r.quantity} sold</strong><small className="muted">{money(r.profit)} profit</small></span>
        </li>
      ))}
    </ol>
  );
}
