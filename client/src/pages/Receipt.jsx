import { useEffect, useRef } from 'react';
import { PrinterIcon } from '../Icons.jsx';
import { money, formatDateTime, PAY_LABEL } from '../api.js';
import { useSettings } from '../SettingsContext.jsx';
import Modal from './Modal.jsx';

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/**
 * A standalone page sized for a thermal receipt printer (58mm or 80mm roll).
 * It's printed on its own, so none of the app's layout ends up on the paper.
 */
export function receiptHtml(sale, settings) {
  const paper = settings.paper_width === '58' ? 58 : 80;
  const printable = paper === 58 ? 48 : 72; // printers can't print to the very edge
  const fontSize = paper === 58 ? 11 : 12;

  const items = sale.items
    .map(
      (i) => `
      <div class="item">${esc(i.product_name)}</div>
      <div class="row"><span>&nbsp;&nbsp;${i.quantity} x ${esc(money(i.unit_price))}</span><span>${esc(money(i.quantity * i.unit_price))}</span></div>`
    )
    .join('');

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Receipt #${sale.id}</title>
<style>
  @page { size: ${paper}mm auto; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; color: #000; }
  body {
    width: ${printable}mm; margin: 0 auto; padding: 3mm 0 6mm;
    font: ${fontSize}px/1.35 "Courier New", Consolas, monospace;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .center { text-align: center; }
  .shop { font-size: ${fontSize + 4}px; font-weight: bold; text-transform: uppercase; margin-bottom: 1mm; }
  .line { border-top: 1px dashed #000; margin: 2mm 0; }
  .row { display: flex; justify-content: space-between; gap: 2mm; }
  .row span:last-child { text-align: right; white-space: nowrap; }
  .item { font-weight: bold; margin-top: 1mm; word-break: break-word; }
  .total { font-size: ${fontSize + 3}px; font-weight: bold; }
  .void { border: 2px solid #000; text-align: center; font-weight: bold; padding: 1mm; margin: 2mm 0; }
  .footer { margin-top: 3mm; }
</style></head>
<body>
  <div class="center">
    <div class="shop">${esc(settings.shop_name)}</div>
    ${settings.address ? `<div>${esc(settings.address)}</div>` : ''}
    ${settings.phone ? `<div>Tel: ${esc(settings.phone)}</div>` : ''}
  </div>
  <div class="line"></div>
  <div class="row"><span>Receipt #${sale.id}</span><span>${esc(formatDateTime(sale.created_at))}</span></div>
  <div>Served by: ${esc(sale.seller_name)}</div>
  ${sale.customer_name ? `<div>Customer: ${esc(sale.customer_name)}</div>` : ''}
  ${sale.voided_at ? `<div class="void">VOIDED<br>${esc(sale.void_reason)}</div>` : ''}
  <div class="line"></div>
  ${items}
  <div class="line"></div>
  <div class="row total"><span>TOTAL</span><span>${esc(money(sale.total))}</span></div>
  <div class="row"><span>Paid by</span><span>${esc(PAY_LABEL[sale.payment_method] || sale.payment_method)}</span></div>
  <div class="line"></div>
  ${settings.receipt_footer ? `<div class="center footer">${esc(settings.receipt_footer)}</div>` : ''}
</body></html>`;
}

export default function Receipt({ sale, onClose, actions }) {
  const { settings } = useSettings();
  const frame = useRef(null);
  const html = receiptHtml(sale, settings);

  // Print, then close the receipt automatically once the print dialog is finished.
  const printAndClose = () => {
    const w = frame.current?.contentWindow;
    if (!w) return;
    let closed = false;
    const close = () => {
      if (!closed) {
        closed = true;
        onClose();
      }
    };
    w.addEventListener('afterprint', close, { once: true });
    w.focus();
    w.print();
    // Some browsers don't fire 'afterprint'; print() blocks until the dialog closes there.
    setTimeout(close, 500);
  };

  // Enter key = print and close, so the attendant can keep their hands on the keyboard/scanner.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Enter' && !e.repeat && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault();
        printAndClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <Modal onClose={onClose} title={`Sale #${sale.id}`}>
      <div className="receipt-preview">
        <iframe
          ref={frame}
          title="Receipt"
          srcDoc={html}
          style={{ width: settings.paper_width === '58' ? '58mm' : '80mm' }}
          onLoad={(e) => {
            // Grow the preview to fit the whole receipt.
            const doc = e.currentTarget.contentDocument;
            if (doc) e.currentTarget.style.height = doc.documentElement.scrollHeight + 'px';
          }}
        />
      </div>
      <div className="modal-actions">
        {actions}
        <button className="btn" onClick={onClose}>Done (no print)</button>
        <button className="btn primary with-icon" onClick={printAndClose} autoFocus>
          <PrinterIcon size={18} /> Print &amp; close
        </button>
      </div>
    </Modal>
  );
}
