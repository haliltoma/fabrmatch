import { useEffect, useState } from 'react';
import { getOrderGroup, type OrderGroup } from '../lib/mercur-custom';
import { money, date } from '../lib/format';
import { statusLabel, statusBadgeTone } from '../lib/order-status';

function StatusBadge({ value }: { value: string }) {
  return <span className={`fm-badge fm-badge--${statusBadgeTone(value)}`}>{statusLabel(value)}</span>;
}

export default function OrderGroupDetail() {
  const [group, setGroup] = useState<OrderGroup | null | undefined>(undefined);

  useEffect(() => {
    const id = window.location.pathname.split('/').pop();
    if (!id) {
      setGroup(null);
      return;
    }
    void getOrderGroup(decodeURIComponent(id)).then(setGroup);
  }, []);

  if (group === undefined) {
    return (
      <p className="fm-spinner-row">
        <i className="ti ti-loader-2 fm-spin" aria-hidden="true" /> Sipariş yükleniyor…
      </p>
    );
  }

  if (!group) {
    return (
      <div className="fm-empty">
        <p>Sipariş bulunamadı.</p>
        <a href="/hesap" className="fm-button fm-button--primary" style={{ marginTop: 12 }}>
          <i className="ti ti-arrow-left" aria-hidden="true" /> siparişlerime dön
        </a>
      </div>
    );
  }

  const currency = group.orders[0]?.currency_code ?? 'try';

  return (
    <div className="fm-page" style={{ padding: 0, gap: 24 }}>
      <div>
        <a href="/hesap" className="fm-back-link">
          <i className="ti ti-arrow-left" aria-hidden="true" /> siparişlerim
        </a>
        <h1 style={{ marginTop: 8 }}>Sipariş #{group.display_id}</h1>
        <p className="fm-small fm-muted">
          <i className="ti ti-calendar" aria-hidden="true" /> {date(group.created_at)} ·{' '}
          <i className="ti ti-building-store" aria-hidden="true" /> {group.seller_count} satıcı · toplam{' '}
          <strong>{money(group.total, currency)}</strong>
        </p>
      </div>

      {group.orders.map((order) => (
        <section className="fm-seller-group" key={order.id}>
          <div className="fm-seller-group__head">
            <h3>{order.seller.name}</h3>
            <StatusBadge value={order.status} />
          </div>
          <div className="fm-seller-group__items">
            {order.items.map((item) => (
              <div className="fm-cart-item" key={item.id}>
                {item.thumbnail ? (
                  <img src={item.thumbnail} alt={item.title} />
                ) : (
                  <div className="fm-cart-item__placeholder" aria-hidden="true" />
                )}
                <div>
                  <strong>{item.product_title}</strong>
                  <div className="fm-small fm-muted">{item.variant_title}</div>
                  <div className="fm-small">{money(item.unit_price, currency)}</div>
                </div>
                <div className="fm-cart-item__qty">
                  <span className="fm-small fm-muted">{item.quantity} adet</span>
                  <span className="fm-small">{money(item.total, currency)}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="fm-summary-row fm-small fm-seller-group__total">
            <span className="fm-muted">Satıcı toplamı</span>
            <span>{money(order.total, currency)}</span>
          </div>
        </section>
      ))}
    </div>
  );
}
