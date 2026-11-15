import { useCallback, useEffect, useState } from 'react';
import { api, money, localDate } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import Modal from './Modal.jsx';

const EMPTY = {
  name: '', category: '', barcode: '', cost_price: '', selling_price: '',
  quantity: '', reorder_level: '10', expiry_date: '', requires_prescription: false,
};

export default function Inventory() {
  const { isAdmin } = useAuth();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [editing, setEditing] = useState(null); // product or EMPTY for new
  const [adjusting, setAdjusting] = useState(null);
  const [error, setError] = useState('');
  const today = localDate();

  const load = useCallback(() => {
    const q = new URLSearchParams();
    if (search) q.set('search', search);
    if (lowOnly) q.set('lowStock', '1');
    if (showInactive) q.set('includeInactive', '1');
    api('/products?' + q).then(setProducts).catch((e) => setError(e.message));
  }, [search, lowOnly, showInactive]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  const expiryClass = (d) => {
    if (!d) return '';
    if (d < today) return 'danger';
    const days = (new Date(d) - new Date(today)) / 864e5;
    return days <= 60 ? 'warn' : '';
  };

  return (
    <div>
      <div className="page-head">
        <h1>Inventory</h1>
        {isAdmin && <button className="btn primary" onClick={() => setEditing(EMPTY)}>+ Add product</button>}
      </div>

      <div className="filters">
        <input placeholder="Search name, barcode or category…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <label className="check">
          <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} /> Low stock only
        </label>
        {isAdmin && (
          <label className="check">
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} /> Show archived
          </label>
        )}
      </div>
      {error && <div className="alert error">{error}</div>}

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              {isAdmin && <th className="num">Cost</th>}
              <th className="num">Price</th>
              <th className="num">In stock</th>
              <th>Expiry</th>
              {isAdmin && <th />}
            </tr>
          </thead>
          <tbody>
            {products.length === 0 && (
              <tr><td colSpan={7} className="muted">No products yet.</td></tr>
            )}
            {products.map((p) => (
              <tr key={p.id} className={p.active ? '' : 'inactive'}>
                <td>
                  <strong>{p.name}</strong>
                  {p.requires_prescription && <span className="badge rx">Rx</span>}
                  {!p.active && <span className="badge">Archived</span>}
                  {p.barcode && <><br /><small className="muted">{p.barcode}</small></>}
                </td>
                <td>{p.category}</td>
                {isAdmin && <td className="num">{money(p.cost_price)}</td>}
                <td className="num">{money(p.selling_price)}</td>
                <td className="num">
                  <span className={p.quantity <= p.reorder_level ? 'badge warn' : ''}>{p.quantity}</span>
                </td>
                <td><span className={'badge ' + expiryClass(p.expiry_date)}>{p.expiry_date || '—'}</span></td>
                {isAdmin && (
                  <td className="actions">
                    <button className="btn small" onClick={() => setAdjusting(p)}>Stock</button>
                    <button className="btn small ghost" onClick={() => setEditing(p)}>Edit</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && <ProductForm product={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {adjusting && <StockForm product={adjusting} onClose={() => setAdjusting(null)} onSaved={() => { setAdjusting(null); load(); }} />}
    </div>
  );
}

function ProductForm({ product, onClose, onSaved }) {
  const isNew = !product.id;
  const [f, setF] = useState({
    ...EMPTY,
    ...Object.fromEntries(Object.entries(product).map(([k, v]) => [k, v ?? ''])),
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const body = {
      name: f.name, category: f.category, barcode: f.barcode,
      cost_price: f.cost_price === '' ? 0 : f.cost_price,
      selling_price: f.selling_price, reorder_level: f.reorder_level === '' ? 0 : f.reorder_level,
      expiry_date: f.expiry_date, requires_prescription: f.requires_prescription,
    };
    if (isNew) body.quantity = f.quantity;
    try {
      await api(isNew ? '/products' : `/products/${product.id}`, { method: isNew ? 'POST' : 'PUT', body });
      onSaved();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const toggleArchive = async () => {
    setBusy(true);
    try {
      await api(`/products/${product.id}`, { method: 'PUT', body: { active: !product.active } });
      onSaved();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <Modal title={isNew ? 'Add product' : `Edit ${product.name}`} onClose={onClose}>
      <form className="form-grid" onSubmit={save}>
        {error && <div className="alert error span2">{error}</div>}
        <label className="span2">Name<input value={f.name} onChange={set('name')} required autoFocus /></label>
        <label>Category<input value={f.category} onChange={set('category')} placeholder="General" /></label>
        <label>Barcode<input value={f.barcode} onChange={set('barcode')} /></label>
        <label>Cost price<input type="number" step="0.01" min="0" value={f.cost_price} onChange={set('cost_price')} /></label>
        <label>Selling price<input type="number" step="0.01" min="0" value={f.selling_price} onChange={set('selling_price')} required /></label>
        {isNew && <label>Opening stock<input type="number" min="0" step="1" value={f.quantity} onChange={set('quantity')} /></label>}
        <label>Reorder when at or below<input type="number" min="0" step="1" value={f.reorder_level} onChange={set('reorder_level')} /></label>
        <label>Expiry date<input type="date" value={f.expiry_date} onChange={set('expiry_date')} /></label>
        <label className="check span2">
          <input type="checkbox" checked={f.requires_prescription} onChange={set('requires_prescription')} />
          Prescription required (Rx)
        </label>
        {!isNew && <p className="muted span2">To change the quantity, use the Stock button so the change is logged.</p>}
        <div className="modal-actions span2">
          {!isNew && (
            <button type="button" className="btn ghost" onClick={toggleArchive} disabled={busy}>
              {product.active ? 'Archive product' : 'Restore product'}
            </button>
          )}
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  );
}

function StockForm({ product, onClose, onSaved }) {
  const [reason, setReason] = useState('restock');
  const [amount, setAmount] = useState('');
  const [direction, setDirection] = useState('add');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const removing = reason === 'expired' || reason === 'damaged' || (reason === 'adjustment' && direction === 'remove');
  const n = parseInt(amount, 10) || 0;
  const after = product.quantity + (removing ? -n : n);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api(`/products/${product.id}/stock`, { method: 'POST', body: { change: removing ? -n : n, reason, note } });
      onSaved();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <Modal title={`Stock: ${product.name}`} onClose={onClose}>
      <form className="form-grid" onSubmit={save}>
        {error && <div className="alert error span2">{error}</div>}
        <label>
          Reason
          <select value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="restock">Restock (new delivery)</option>
            <option value="adjustment">Stock count correction</option>
            <option value="expired">Remove expired stock</option>
            <option value="damaged">Remove damaged stock</option>
          </select>
        </label>
        {reason === 'adjustment' && (
          <label>
            Direction
            <select value={direction} onChange={(e) => setDirection(e.target.value)}>
              <option value="add">Add</option>
              <option value="remove">Remove</option>
            </select>
          </label>
        )}
        <label>Quantity<input type="number" min="1" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} required autoFocus /></label>
        <label className="span2">Note (optional)<input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. supplier invoice number" /></label>
        <p className="span2">
          Current: <strong>{product.quantity}</strong> → After: <strong className={after < 0 ? 'text-danger' : ''}>{after}</strong>
        </p>
        <div className="modal-actions span2">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={busy || n <= 0 || after < 0}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  );
}
