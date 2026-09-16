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
          giriş yap
        </a>
      </div>
    );
  }

  const fullName = [customer.first_name, customer.last_name].filter(Boolean).join(' ');

  return (
    <div className="fm-page" style={{ padding: 0, gap: 24 }}>
      <section
        className="fm-seller-group"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}
      >
        <div>
          <h1>{fullName || 'Hesabım'}</h1>
          <p className="fm-small fm-muted">{customer.email}</p>
        </div>
        <button type="button" className="fm-button" onClick={onLogout}>
          <i className="ti ti-logout" aria-hidden="true" /> çıkış
        </button>
      </section>

      <section>
        <h2>Siparişlerim</h2>
        {groups === null ? (
          <p className="fm-spinner-row" style={{ marginTop: 12 }}>
            Siparişler yükleniyor…
          </p>
        ) : groups.length === 0 ? (
          <div className="fm-empty" style={{ marginTop: 12 }}>
            <p>Henüz siparişiniz yok.</p>
            <a href="/urunler" className="fm-button fm-button--primary" style={{ marginTop: 12 }}>
              ürünlere göz at
            </a>
          </div>
        ) : (
          <div className="fm-order-list">
            {groups.map((group) => (
              <a className="fm-entry-card fm-entry-card--secondary fm-order-card" href={`/hesap/siparis/${group.id}`} key={group.id}>
                <div className="fm-order-card__head">
                  <strong>#{group.display_id}</strong>
                  <span className="fm-small fm-muted">{date(group.created_at)}</span>
                </div>
                <div className="fm-small fm-muted">
                  {group.seller_count} satıcı ·{' '}
                  {group.orders.map((order) => statusLabel(order.status)).join(', ')}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span>{money(group.total, group.orders[0]?.currency_code ?? 'try')}</span>
                  <span className="fm-small fm-muted">detayı görüntüle →</span>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
