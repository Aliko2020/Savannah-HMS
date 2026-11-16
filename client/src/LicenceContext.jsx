import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from './api.js';
import Activate from './pages/Activate.jsx';

const LicenceContext = createContext(null);
const LOCKED = ['missing', 'invalid', 'wrong_machine'];

/** Loads the licence state. If this PC isn't activated, shows the activation screen instead of the app. */
export function LicenceProvider({ children }) {
  const [licence, setLicence] = useState(null);

  const refresh = useCallback(() => api('/licence').then(setLicence), []);
  useEffect(() => {
    refresh().catch(() => setLicence({ state: 'disabled' }));
  }, [refresh]);

  const activate = async (key) => setLicence(await api('/licence', { method: 'POST', body: { key } }));

  if (!licence) return <div className="center muted">Loading…</div>;
  const value = {
    licence,
    activate,
    refresh,
    expired: licence.state === 'expired',
    expiringSoon: licence.state === 'valid' && licence.daysLeft <= licence.remindDays,
  };
  return (
    <LicenceContext.Provider value={value}>
      {LOCKED.includes(licence.state) ? <Activate /> : children}
    </LicenceContext.Provider>
  );
}

export const useLicence = () => useContext(LicenceContext);

/** WhatsApp link that sends the developer this PC's machine ID. */
export function whatsappLink(licence, shopName, renew = false) {
  const text = renew
    ? `Hello ${licence.contact.name}, please renew our Savannah Pharmacy licence.\nShop: ${shopName}\nMachine ID: ${licence.machineId}`
    : `Hello ${licence.contact.name}, please send a Savannah Pharmacy licence key.\nShop: ${shopName}\nMachine ID: ${licence.machineId}`;
  return `https://wa.me/${licence.contact.whatsapp}?text=${encodeURIComponent(text)}`;
}
