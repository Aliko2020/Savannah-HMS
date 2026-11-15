import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import { SHOP_NAME } from './api.js';
import Login from './pages/Login.jsx';
import Sell from './pages/Sell.jsx';
import Inventory from './pages/Inventory.jsx';
import Sales from './pages/Sales.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Users from './pages/Users.jsx';
import StockLog from './pages/StockLog.jsx';
import Account from './pages/Account.jsx';

export default function App() {
  const { user, loading, logout, isAdmin } = useAuth();

  if (loading) return <div className="center muted">Loading…</div>;
  if (!user) return <Login />;

  const links = [
    isAdmin && ['/dashboard', 'Dashboard'],
    ['/sell', 'Sell'],
    ['/inventory', 'Inventory'],
    ['/sales', isAdmin ? 'Sales' : 'My sales'],
    isAdmin && ['/stock-log', 'Stock log'],
    isAdmin && ['/users', 'Staff'],
  ].filter(Boolean);

  return (
    <div className="layout">
      <header className="topbar">
        <div className="brand">{SHOP_NAME}</div>
        <nav>
          {links.map(([to, label]) => (
            <NavLink key={to} to={to}>{label}</NavLink>
          ))}
        </nav>
        <div className="userbox">
          <NavLink to="/account" className="muted">
            {user.name} · {isAdmin ? 'Owner' : 'Attendant'}
          </NavLink>
          <button className="btn small ghost" onClick={logout}>Log out</button>
        </div>
      </header>
      <main>
        <Routes>
          <Route path="/sell" element={<Sell />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/account" element={<Account />} />
          {isAdmin && <Route path="/dashboard" element={<Dashboard />} />}
          {isAdmin && <Route path="/users" element={<Users />} />}
          {isAdmin && <Route path="/stock-log" element={<StockLog />} />}
          <Route path="*" element={<Navigate to={isAdmin ? '/dashboard' : '/sell'} replace />} />
        </Routes>
      </main>
    </div>
  );
}
