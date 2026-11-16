import { useState } from 'react';
import { useLicence, whatsappLink } from '../LicenceContext.jsx';
import { useSettings } from '../SettingsContext.jsx';
import { MachineId, KeyForm } from './Activate.jsx';
import { CheckCircleIcon, AlertIcon, WhatsAppIcon, KeyIcon } from '../Icons.jsx';

/** Owner's view of the licence on the Settings page, with renewal. */
export default function LicenceCard() {
  const { licence, expired, expiringSoon } = useLicence();
  const { settings } = useSettings();
  const [renewing, setRenewing] = useState(false);
  const [done, setDone] = useState(false);

  if (licence.state === 'disabled') return null; // licensing not set up in this copy

  const tone = expired ? 'bad' : expiringSoon ? 'warn' : 'good';
  return (
    <div className="card">
      <h2>Licence</h2>
      {done && <div className="alert ok">New licence key saved. Thank you!</div>}
      <div className={'backup-status ' + tone}>
        {tone === 'good' ? <CheckCircleIcon size={20} /> : <AlertIcon size={20} />}
        <span>
          <strong>{expired ? 'Expired' : `${licence.daysLeft} day${licence.daysLeft === 1 ? '' : 's'} left`}</strong>
          <small>{expired ? 'Ended' : 'Valid until'} {licence.expires}</small>
        </span>
      </div>
      <dl className="licence-details">
        <dt>Licensed to</dt><dd>{licence.shop}</dd>
        <dt>This computer</dt><dd><MachineId id={licence.machineId} /></dd>
      </dl>
      {!renewing ? (
        <button className="btn with-icon full" onClick={() => { setRenewing(true); setDone(false); }}>
          <KeyIcon size={17} /> Enter a new licence key
        </button>
      ) : (
        <>
          <a className="btn with-icon whatsapp full" href={whatsappLink(licence, settings.shop_name, true)} target="_blank" rel="noreferrer">
            <WhatsAppIcon size={18} /> Ask {licence.contact.name} for a renewal
          </a>
          <KeyForm buttonLabel="Save new key" onDone={() => { setRenewing(false); setDone(true); }} />
        </>
      )}
      <p className="muted small">Licence questions: {licence.contact.name}, {licence.contact.phone}, {licence.contact.website}</p>
    </div>
  );
}
