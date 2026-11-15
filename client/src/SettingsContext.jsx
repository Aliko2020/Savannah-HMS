import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, setCurrency } from './api.js';

const SettingsContext = createContext(null);

const FALLBACK = { shop_name: 'Savannah Pharmacy', phone: '', address: '', receipt_footer: '', currency: 'GH₵', paper_width: '80' };

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(null);

  const apply = useCallback((s) => {
    setCurrency(s.currency);
    document.title = s.shop_name;
    setSettings(s);
  }, []);

  useEffect(() => {
    api('/settings').then(apply).catch(() => apply(FALLBACK));
  }, [apply]);

  const save = async (changes) => apply(await api('/settings', { method: 'PUT', body: changes }));

  if (!settings) return <div className="center muted">Loading…</div>;
  return <SettingsContext.Provider value={{ settings, save }}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => useContext(SettingsContext);
