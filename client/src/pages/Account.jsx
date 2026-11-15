import { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';

export default function Account() {
  const { user } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState(null);

  const save = async (e) => {
    e.preventDefault();
    if (next !== confirm) return setMsg({ error: true, text: 'New passwords do not match' });
    try {
      await api('/auth/change-password', { method: 'POST', body: { currentPassword: current, newPassword: next } });
      setMsg({ text: 'Password changed.' });
      setCurrent(''); setNext(''); setConfirm('');
    } catch (err) {
      setMsg({ error: true, text: err.message });
    }
  };

  return (
    <div>
      <div className="page-head"><h1>My account</h1></div>
      <form className="card narrow" onSubmit={save}>
        <p>{user.name} (<strong>{user.username}</strong>)</p>
        <h2>Change password</h2>
        {msg && <div className={'alert ' + (msg.error ? 'error' : 'ok')}>{msg.text}</div>}
        <label>Current password<input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required /></label>
        <label>New password<input type="password" value={next} onChange={(e) => setNext(e.target.value)} minLength={6} required /></label>
        <label>Confirm new password<input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required /></label>
        <button className="btn primary">Change password</button>
      </form>
    </div>
  );
}
