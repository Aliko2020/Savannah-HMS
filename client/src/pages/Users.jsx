import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import Modal from './Modal.jsx';

export default function Users() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => api('/users').then(setUsers).catch((e) => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="page-head">
        <h1>Staff</h1>
        <button className="btn primary" onClick={() => setEditing({})}>+ Add staff</button>
      </div>
      {error && <div className="alert error">{error}</div>}
      <div className="card table-wrap">
        <table>
          <thead>
            <tr><th>Name</th><th>Username</th><th>Role</th><th>Status</th><th /></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className={u.active ? '' : 'inactive'}>
                <td>{u.name}{u.id === me.id && <span className="badge">You</span>}</td>
                <td>{u.username}</td>
                <td>{u.role === 'admin' ? 'Owner' : 'Attendant'}</td>
                <td>{u.active ? 'Active' : <span className="badge danger">Disabled</span>}</td>
                <td className="actions"><button className="btn small ghost" onClick={() => setEditing(u)}>Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && (
        <UserForm user={editing} isMe={editing.id === me.id} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
      )}
    </div>
  );
}

function UserForm({ user, isMe, onClose, onSaved }) {
  const isNew = !user.id;
  const [f, setF] = useState({ name: user.name || '', username: user.username || '', role: user.role || 'attendant', password: '', active: user.active ?? true });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (isNew) await api('/users', { method: 'POST', body: f });
      else await api(`/users/${user.id}`, { method: 'PUT', body: { name: f.name, role: f.role, active: f.active, password: f.password || undefined } });
      onSaved();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <Modal title={isNew ? 'Add staff member' : `Edit ${user.name}`} onClose={onClose}>
      <form className="form-grid" onSubmit={save}>
        {error && <div className="alert error span2">{error}</div>}
        <label>Full name<input value={f.name} onChange={set('name')} required autoFocus /></label>
        <label>Username<input value={f.username} onChange={set('username')} required disabled={!isNew} autoCapitalize="none" /></label>
        <label>
          Role
          <select value={f.role} onChange={set('role')} disabled={isMe}>
            <option value="attendant">Attendant: sell, view stock</option>
            <option value="admin">Owner: full access</option>
          </select>
        </label>
        <label>
          {isNew ? 'Password' : 'New password (leave blank to keep)'}
          <input type="password" value={f.password} onChange={set('password')} required={isNew} minLength={6} />
        </label>
        {!isNew && !isMe && (
          <label className="check span2">
            <input type="checkbox" checked={f.active} onChange={set('active')} /> Account active (untick to block login)
          </label>
        )}
        <div className="modal-actions span2">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  );
}
