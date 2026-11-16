import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { useSettings } from '../SettingsContext.jsx';
import { PharmacyIcon, PillIcon, UserIcon, LockIcon, EyeIcon, EyeOffIcon, LoginIcon } from '../Icons.jsx';
import { useLicence } from '../LicenceContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const { settings } = useSettings();
  const { licence } = useLicence();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(username, password);
      // Always start on the home page for this role, not wherever the last user was.
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="center login-page">
      <form className="card login" onSubmit={submit}>
        <div className="login-logo">
          <PharmacyIcon size={34} />
        </div>
        <h1>{settings.shop_name}</h1>
        <p className="muted">Sign in to continue</p>
        {error && <div className="alert error">{error}</div>}

        <label>
          Username
          <span className="input-icon">
            <UserIcon size={18} />
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus autoCapitalize="none" autoComplete="username" required />
          </span>
        </label>
        <label>
          Password
          <span className="input-icon">
            <LockIcon size={18} />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              className="reveal"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
            </button>
          </span>
        </label>
        <button className="btn primary with-icon" disabled={busy}>
          <LoginIcon size={18} />
          {busy ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="login-foot muted">
          <PillIcon size={14} /> {settings.phone ? `Tel: ${settings.phone}` : 'Pharmacy management'}
        </p>
        <p className="copyright muted">© {new Date().getFullYear()} {licence.contact?.name || 'Amos Aliko'} · {licence.contact?.website || 'edusavannah.com'}</p>
      </form>
    </div>
  );
}
