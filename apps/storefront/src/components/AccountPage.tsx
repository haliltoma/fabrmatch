import { useCallback, useEffect, useState } from 'react';
import {
  getSessionCustomer,
  logoutCustomer,
  notifyAuthChanged,
  type StoreCustomer,
} from '../lib/auth';
import { listOrderGroups, type OrderGroup } from '../lib/mercur-custom';
import { money, date } from '../lib/format';
import { statusLabel } from '../lib/order-status';

export default function AccountPage() {
  const [customer, setCustomer] = useState<StoreCustomer | null | undefined>(undefined);
  const [groups, setGroups] = useState<OrderGroup[] | null>(null);

  useEffect(() => {
    void getSessionCustomer().then(setCustomer);
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      setGroups(await listOrderGroups());
    } catch {
      setGroups([]);
    }
  }, []);

  useEffect(() => {
    if (customer) void loadOrders();
  }, [customer, loadOrders]);

  async function onLogout() {
    await logoutCustomer();
    notifyAuthChanged();
    window.location.href = '/';
  }

  if (customer === undefined) {
    return <p className="fm-spinner-row">Yükleniyor…</p>;
  }

  if (!customer) {
    return (
      <div className="fm-empty">
        <p>Siparişlerinizi görmek ve takip etmek için giriş yapın.</p>
        <a href="/giris" className="fm-button fm-button--primary" style={{ marginTop: 12 }}>
          <i className="ti ti-login" aria-hidden="true" /> giriş yap
        </a>
      </div>
    );
  }

  const fullName = [customer.first_name, customer.last_name].filter(Boolean).join(' ');

  return (
    <div className="fm-page" style={{ padding: 0, gap: 24 }}>
      <section className="fm-account-head">
        <div className="fm-account-head__info">
          <h1>{fullName || 'Hesabım'}</h1>
          <p className="fm-small fm-muted">
            <i className="ti ti-mail" aria-hidden="true" /> {customer.email}
          </p>
        </div>
        <button type="button" className="fm-button" onClick={onLogout}>
          <i className="ti ti-logout" aria-hidden="true" /> çıkış
        </button>
      </section>

      <section>
        <div className="fm-section-head">
          <h2>Siparişlerim</h2>
          {groups && groups.length > 0 && (
            <span className="fm-small fm-muted">{groups.length} sipariş</span>
          )}
        </div>

        {groups === null ? (
          <p className="fm-spinner-row" style={{ marginTop: 12 }}>
            <i className="ti ti-loader-2 fm-spin" aria-hidden="true" /> Siparişler yükleniyor…
          </p>
        ) : groups.length === 0 ? (
          <div className="fm-empty" style={{ marginTop: 12 }}>
            <p>Henüz siparişiniz yok.</p>
            <a href="/urunler" className="fm-button fm-button--primary" style={{ marginTop: 12 }}>
              <i className="ti ti-shopping-bag" aria-hidden="true" /> ürünlere göz at
            </a>
          </div>
        ) : (
          <div className="fm-order-list">
            {groups.map((group) => (
              <a
                className="fm-entry-card fm-entry-card--secondary fm-order-card"
                href={`/hesap/siparis/${group.id}`}
                key={group.id}
              >
                <div className="fm-order-card__head">
                  <strong>#{group.display_id}</strong>
                  <span className="fm-small fm-muted">{date(group.created_at)}</span>
                </div>
                <div className="fm-small fm-muted">
                  <i className="ti ti-building-store" aria-hidden="true" /> {group.seller_count} satıcı ·{' '}
                  {group.orders.map((order) => statusLabel(order.status)).join(', ')}
                </div>
                <div className="fm-order-card__foot">
                  <span>{money(group.total, group.orders[0]?.currency_code ?? 'try')}</span>
                  <span className="fm-small fm-muted">
                    detayı görüntüle <i className="ti ti-chevron-right" aria-hidden="true" />
                  </span>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
