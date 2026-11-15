import { money, formatDateTime, SHOP_NAME } from '../api.js';
import Modal from './Modal.jsx';

const PAY_LABEL = { cash: 'Cash', card: 'Card', mobile: 'Mobile money' };

export default function Receipt({ sale, onClose, actions }) {
  return (
    <Modal onClose={onClose} title={`Sale #${sale.id}`}>
      <div className="receipt" id="receipt">
        <h3>{SHOP_NAME}</h3>
        <p className="muted">
          Receipt #{sale.id} · {formatDateTime(sale.created_at)}
          <br />
          Served by {sale.seller_name}
          {sale.customer_name && <><br />Customer: {sale.customer_name}</>}
        </p>
        {sale.voided_at && (
          <div className="alert error">
            VOIDED {formatDateTime(sale.voided_at)} by {sale.voided_by_name}: {sale.void_reason}
          </div>
        )}
        <table>
          <tbody>
            {sale.items.map((i) => (
              <tr key={i.id}>
                <td>{i.product_name}</td>
                <td className="num">{i.quantity} × {money(i.unit_price)}</td>
                <td className="num">{money(i.quantity * i.unit_price)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th colSpan={2}>Total ({PAY_LABEL[sale.payment_method]})</th>
              <th className="num">{money(sale.total)}</th>
            </tr>
          </tfoot>
        </table>
        <p className="muted thanks">Thank you. Get well soon!</p>
      </div>
      <div className="modal-actions no-print">
        {actions}
        <button className="btn" onClick={() => window.print()}>Print</button>
        <button className="btn primary" onClick={onClose}>Done</button>
      </div>
    </Modal>
  );
}
