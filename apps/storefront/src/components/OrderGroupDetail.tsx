import { useEffect, useState } from 'react';
import { getOrderGroup, type OrderGroup } from '../lib/mercur-custom';
import { money, date } from '../lib/format';
import { statusLabel, statusBadgeTone } from '../lib/order-status';

function StatusBadge({ value }: { value: string }) {
  return <span className={`fm-badge fm-badge--${statusBadgeTone(value)}`}>{statusLabel(value)}</span>;
}

/**
 * Sipariş detayı — client:only island prop almadığından id'yi pathname'den okur
 * (/hesap/siparis/[id], prerender=false).
 */
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
    return <p className="fm-spinner-row">Sipariş yükleniyor…</p>;
  }

  if (!group) {
    return (
      <div className="fm-empty">
        <p>Sipariş bulunamadı.</p>
        <a href="/hesap" className="fm-button fm-button--primary" style={{ marginTop: 12 }}>
          siparişlerime dön
        </a>
      </div>
    );
  }

  const currency = group.orders[0]?.currency_code ?? 'try';

  return (
    <div className="fm-page" style={{ padding: 0, gap: 24 }}>
      <div>
        <a href="/hesap" className="fm-small fm-muted">
          ← siparişlerim
        </a>
        <h1 style={{ marginTop: 8 }}>Sipariş #{group.display_id}</h1>
        <p className="fm-small fm-muted">
          {date(group.created_at)} · {group.seller_count} satıcı · toplam {money(group.total, currency)}
        </p>
      </div>

      {group.orders.map((order) => (
        <section className="fm-seller-group" key={order.id}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            <h3 style={{ marginRight: 'auto' }}>{order.seller.name}</h3>
            <StatusBadge value={order.status} />
          </div>
          <div style={{ marginTop: 8 }}>
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
                <div className="fm-small fm-muted" style={{ textAlign: 'right' }}>
                  {item.quantity} adet
                  <div>{money(item.total, currency)}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="fm-summary-row fm-small" style={{ marginTop: 8 }}>
            <span className="fm-muted">Satıcı toplamı</span>
            <span>{money(order.total, currency)}</span>
          </div>
        </section>
      ))}
    </div>
  );
}
