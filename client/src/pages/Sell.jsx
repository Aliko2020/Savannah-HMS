import { useEffect, useMemo, useRef, useState } from 'react';
import { api, money, localDate, PAY_LABEL } from '../api.js';
import Receipt from './Receipt.jsx';

export default function Sell() {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [cart, setCart] = useState([]); // [{ product, quantity }]
  const [payment, setPayment] = useState('cash');
  const [customer, setCustomer] = useState('');
  const [rxChecked, setRxChecked] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const searchRef = useRef(null);
  const today = localDate();

  // Search as you type (short delay so we don't call the API on every key).
  useEffect(() => {
    const t = setTimeout(() => {
      api('/products' + (search ? `?search=${encodeURIComponent(search)}` : ''))
        .then(setResults)
        .catch((e) => setError(e.message));
    }, 200);
    return () => clearTimeout(t);
  }, [search]);

  const inCart = (id) => cart.find((l) => l.product.id === id)?.quantity || 0;
  const isExpired = (p) => p.expiry_date && p.expiry_date < today;

  const add = (product) => {
    setError('');
    if (isExpired(product)) return setError(`${product.name} has expired and cannot be sold.`);
    if (inCart(product.id) >= product.quantity) return setError(`Only ${product.quantity} of ${product.name} in stock.`);
    setCart((c) =>
      c.some((l) => l.product.id === product.id)
        ? c.map((l) => (l.product.id === product.id ? { ...l, quantity: l.quantity + 1 } : l))
        : [...c, { product, quantity: 1 }]
    );
  };

  const setQty = (id, qty) => {
    setCart((c) =>
      c
        .map((l) => (l.product.id === id ? { ...l, quantity: Math.min(Math.max(qty, 0), l.product.quantity) } : l))
        .filter((l) => l.quantity > 0)
    );
  };

  // Pressing Enter with a scanned barcode adds that product straight away.
  const onSearchKey = (e) => {
    if (e.key !== 'Enter') return;
    const exact = results.find((p) => p.barcode && p.barcode === search.trim());
    const pick = exact || (results.length === 1 ? results[0] : null);
    if (pick) {
      add(pick);
      setSearch('');
    }
  };

  const total = useMemo(() => cart.reduce((s, l) => s + l.product.selling_price * l.quantity, 0), [cart]);
  const needsRx = cart.some((l) => l.product.requires_prescription);

  const checkout = async () => {
    if (needsRx && !rxChecked) return setError('Confirm you have seen a valid prescription for the Rx items.');
    setBusy(true);
    setError('');
    try {
      const sale = await api('/sales', {
        method: 'POST',
        body: {
          items: cart.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
          paymentMethod: payment,
          customerName: customer,
        },
      });
      setReceipt(sale);
      setCart([]);
      setCustomer('');
      setRxChecked(false);
      setPayment('cash');
      setResults(await api('/products' + (search ? `?search=${encodeURIComponent(search)}` : '')));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sell">
      <section className="card">
        <input
          ref={searchRef}
          className="search"
          placeholder="Search by name or scan barcode…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={onSearchKey}
          autoFocus
        />
        <div className="product-list">
          {results.length === 0 && <p className="muted">No products found.</p>}
          {results.map((p) => {
            const out = p.quantity - inCart(p.id) <= 0;
            return (
              <button key={p.id} className="product-row" onClick={() => add(p)} disabled={out || isExpired(p)}>
                <span>
                  <strong>{p.name}</strong>
                  {p.requires_prescription && <span className="badge rx">Rx</span>}
                  {isExpired(p) && <span className="badge danger">Expired</span>}
                  <br />
                  <small className="muted">
                    {p.category} · {p.quantity} in stock
                  </small>
                </span>
                <span className="price">{money(p.selling_price)}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="card cart">
        <h2>Current sale</h2>
        {error && <div className="alert error">{error}</div>}
        {cart.length === 0 ? (
          <p className="muted">Tap a product to add it.</p>
        ) : (
          <table>
            <tbody>
              {cart.map((l) => (
                <tr key={l.product.id}>
                  <td>{l.product.name}</td>
                  <td className="qty">
                    <button className="btn small" onClick={() => setQty(l.product.id, l.quantity - 1)}>−</button>
                    <input
                      type="number"
                      min="1"
                      value={l.quantity}
                      onChange={(e) => setQty(l.product.id, parseInt(e.target.value, 10) || 0)}
                    />
                    <button className="btn small" onClick={() => setQty(l.product.id, l.quantity + 1)}>+</button>
                  </td>
                  <td className="num">{money(l.product.selling_price * l.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="total">
          <span>Total</span>
          <strong>{money(total)}</strong>
        </div>

        <div className="pay-methods">
          {['cash', 'mobile'].map((m) => (
            <button key={m} className={'btn' + (payment === m ? ' primary' : '')} onClick={() => setPayment(m)}>
              {PAY_LABEL[m]}
            </button>
          ))}
        </div>

        <input placeholder="Customer name (optional)" value={customer} onChange={(e) => setCustomer(e.target.value)} />

        {needsRx && (
          <label className="check">
            <input type="checkbox" checked={rxChecked} onChange={(e) => { setRxChecked(e.target.checked); setError(''); }} />
            I have seen a valid prescription for the Rx items
          </label>
        )}

        <button className="btn primary big" disabled={!cart.length || busy} onClick={checkout}>
          {busy ? 'Saving…' : `Complete sale · ${money(total)}`}
        </button>
        {cart.length > 0 && (
          <button className="btn ghost" onClick={() => setCart([])}>Clear</button>
        )}
      </section>

      {receipt && (
        <Receipt
          sale={receipt}
          onClose={() => {
            setReceipt(null);
            searchRef.current?.focus();
          }}
        />
      )}
    </div>
  );
}
