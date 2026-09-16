import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { HttpTypes } from '@medusajs/types';
import { sdk } from '../lib/sdk';
import {
  completeCart,
  getSellerNames,
  listShippingOptionsBySeller,
  transferCart,
  type ShippingOption,
} from '../lib/mercur-custom';
import { getSessionCustomer, type StoreCustomer } from '../lib/auth';
import { clearStoredCartId, getStoredCartId } from '../lib/cart-storage';
import { notifyCartUpdated } from '../lib/cart-events';
import { money } from '../lib/format';

type Cart = HttpTypes.StoreCart;
type Confirmation = { id: string; customer_id?: string; seller_count: number; total: number };

const CART_FIELDS =
  '*items,*region,*shipping_address,*billing_address,*shipping_methods,*payment_collection.payment_sessions';

type AddressFormState = {
  email: string;
  first_name: string;
  last_name: string;
  address_1: string;
  city: string;
  postal_code: string;
  phone: string;
};

const emptyAddress: AddressFormState = {
  email: '',
  first_name: '',
  last_name: '',
  address_1: '',
  city: '',
  postal_code: '',
  phone: '',
};

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null | 'not-found'>(null);
  const [sellerNames, setSellerNames] = useState<Record<string, string>>({});
  const [shippingOptions, setShippingOptions] = useState<Record<string, ShippingOption[]> | null>(null);
  const [selectedShipping, setSelectedShipping] = useState<Record<string, string>>({});
  const [address, setAddress] = useState<AddressFormState>(emptyAddress);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [customer, setCustomer] = useState<StoreCustomer | null>(null);
  const transferAttempted = useRef(false);

  const cartId = useMemo(() => getStoredCartId(), []);

  const reloadCart = useCallback(async () => {
    if (!cartId) {
      setCart('not-found');
      return null;
    }
    try {
      const { cart } = await sdk.store.cart.retrieve(cartId, { fields: CART_FIELDS });
      setCart(cart);
      return cart;
    } catch {
      clearStoredCartId();
      setCart('not-found');
      return null;
    }
  }, [cartId]);

  useEffect(() => {
    void reloadCart();
  }, [reloadCart]);

  useEffect(() => {
    if (cart && cart !== 'not-found' && cart.email) {
      setAddress((prev) => ({ ...prev, email: cart.email ?? prev.email }));
    }
  }, [cart]);

  // Girişli müşteri sepeti kendi hesabına bağlar (POST /store/carts/:id/customer).
  // İlk yüklemede bir kez denenir; hata olursa sessizce misafir olarak devam edilir.
  useEffect(() => {
    if (transferAttempted.current || !cart || cart === 'not-found' || !cartId) return;
    transferAttempted.current = true;
    void (async () => {
      try {
        const session = await getSessionCustomer();
        setCustomer(session);
        if (session && cart.customer_id !== session.id) {
          await transferCart(cartId);
          await reloadCart();
        }
      } catch {
        // misafir olarak devam
      }
    })();
  }, [cart, cartId, reloadCart]);

  // Girişliyse adres e-postasını müşteri e-postasıyla öndoldur
  useEffect(() => {
    if (customer) {
      setAddress((prev) => ({ ...prev, email: prev.email || customer.email }));
    }
  }, [customer]);

  async function updateQuantity(lineItemId: string, quantity: number) {
    if (!cartId) return;
    setBusy(lineItemId);
    try {
      if (quantity <= 0) {
        await sdk.store.cart.deleteLineItem(cartId, lineItemId);
      } else {
        await sdk.store.cart.updateLineItem(cartId, lineItemId, { quantity });
      }
      await reloadCart();
      notifyCartUpdated();
    } finally {
      setBusy(null);
    }
  }

  async function submitAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cartId) return;
    setBusy('address');
    setError(null);
    try {
      const payload = {
        first_name: address.first_name,
        last_name: address.last_name,
        address_1: address.address_1,
        city: address.city,
        postal_code: address.postal_code,
        phone: address.phone,
        country_code: 'tr',
      };
      await sdk.store.cart.update(cartId, {
        email: address.email,
        shipping_address: payload,
        billing_address: payload,
      });
      const updated = await reloadCart();
      if (updated) {
        const options = await listShippingOptionsBySeller(cartId);
        const names = await getSellerNames(Object.keys(options));
        setShippingOptions(options);
        setSellerNames(names);
      }
    } catch {
      setError('Adres kaydedilemedi, bilgileri kontrol edip tekrar deneyin.');
    } finally {
      setBusy(null);
    }
  }

  async function confirmShipping() {
    if (!cartId || !shippingOptions) return;
    const optionIds = Object.values(selectedShipping);
    if (optionIds.length !== Object.keys(shippingOptions).length) {
      setError('Her satıcı için bir kargo seçeneği seçmelisiniz.');
      return;
    }
    setBusy('shipping');
    setError(null);
    try {
      await sdk.store.cart.addShippingMethod(cartId, optionIds.map((option_id) => ({ option_id })));
      const updated = await reloadCart();
      if (updated && updated.region_id) {
        const { payment_providers } = await sdk.store.payment.listPaymentProviders({
          region_id: updated.region_id,
        });
        if (payment_providers[0]) setProviderId(payment_providers[0].id);
      }
    } catch {
      setError('Kargo yöntemi kaydedilemedi, tekrar deneyin.');
    } finally {
      setBusy(null);
    }
  }

  async function confirmPayment() {
    if (!cartId || !cart || cart === 'not-found' || !providerId) return;
    setBusy('payment');
    setError(null);
    try {
      await sdk.store.payment.initiatePaymentSession(cart, { provider_id: providerId });
      await reloadCart();
    } catch {
      setError('Ödeme yöntemi başlatılamadı, tekrar deneyin.');
    } finally {
      setBusy(null);
    }
  }

  async function placeOrder() {
    if (!cartId) return;
    setBusy('complete');
    setError(null);
    try {
      const result = await completeCart(cartId);
      if (result.type === 'order_group') {
        setConfirmation({ ...result.order_group });
        clearStoredCartId();
        notifyCartUpdated();
      } else {
        setError(result.error?.message ?? 'Ödeme tamamlanamadı, tekrar deneyin.');
        await reloadCart();
      }
    } catch {
      setError('Sipariş tamamlanamadı, tekrar deneyin.');
    } finally {
      setBusy(null);
    }
  }

  if (confirmation) {
    return (
      <div className="fm-confirm">
        <i className="ti ti-circle-check" aria-hidden="true" />
        <h1>Siparişiniz alındı</h1>
        <p className="fm-muted">
          Sipariş numaranız <strong>{confirmation.id}</strong>. {confirmation.seller_count} satıcıdan
          gönderilecek, toplam {money(confirmation.total, cart !== 'not-found' && cart ? cart.currency_code : 'try')}.
        </p>
        {customer && confirmation.customer_id === customer.id ? (
          <a href={`/hesap/siparis/${confirmation.id}`} className="fm-button fm-button--primary">
            siparişinizi görüntüleyin →
          </a>
        ) : (
          <p className="fm-small fm-notice fm-notice--info" style={{ maxWidth: 420 }}>
            Bu sipariş numarasını not edin — hesap girişi olmadan sipariş takibi şu an için bu sayfayla sınırlıdır.
          </p>
        )}
        <a href="/urunler" className="fm-button fm-button--primary">
          alışverişe devam et
        </a>
      </div>
    );
  }

  if (cart === null) {
    return <p className="fm-spinner-row">Sepet yükleniyor…</p>;
  }

  if (cart === 'not-found' || !cart.items?.length) {
    return (
      <div className="fm-empty">
        <p>Sepetiniz boş.</p>
        <a href="/urunler" className="fm-button fm-button--primary" style={{ marginTop: 12 }}>
          ürünlere göz at
        </a>
      </div>
    );
  }

  const hasAddress = Boolean(cart.shipping_address?.address_1);
  const hasShipping = (cart.shipping_methods?.length ?? 0) > 0;
  const hasPayment = (cart.payment_collection?.payment_sessions?.length ?? 0) > 0;
  const canPlaceOrder = hasAddress && hasShipping && hasPayment;

  return (
    <div className="fm-cart-layout">
      <div>
        <h1>Sepetiniz</h1>
        <div>
          {cart.items.map((item) => (
            <div className="fm-cart-item" key={item.id}>
              {item.thumbnail ? (
                <img src={item.thumbnail} alt={item.title} />
              ) : (
                <div className="fm-cart-item__placeholder" aria-hidden="true" />
              )}
              <div>
                <strong>{item.product_title}</strong>
                <div className="fm-small fm-muted">{item.variant_title}</div>
                <div className="fm-small">{money(item.unit_price, cart.currency_code)}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  className="fm-button"
                  disabled={busy === item.id}
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  aria-label="Azalt"
                >
                  −
                </button>
                <span aria-live="polite">{item.quantity}</span>
                <button
                  type="button"
                  className="fm-button"
                  disabled={busy === item.id}
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  aria-label="Artır"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>

        {!hasAddress && (
          <section className="fm-form" style={{ marginTop: 24 }}>
            <h2>Teslimat adresi</h2>
            <form className="fm-form" onSubmit={submitAddress}>
              <div className="fm-field">
                <label htmlFor="email">E-posta</label>
                <input
                  id="email"
                  type="email"
                  required
                  value={address.email}
                  onChange={(e) => setAddress((prev) => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div className="fm-form__grid">
                <div className="fm-field">
                  <label htmlFor="first_name">Ad</label>
                  <input
                    id="first_name"
                    required
                    value={address.first_name}
                    onChange={(e) => setAddress((prev) => ({ ...prev, first_name: e.target.value }))}
                  />
                </div>
                <div className="fm-field">
                  <label htmlFor="last_name">Soyad</label>
                  <input
                    id="last_name"
                    required
                    value={address.last_name}
                    onChange={(e) => setAddress((prev) => ({ ...prev, last_name: e.target.value }))}
                  />
                </div>
              </div>
              <div className="fm-field">
                <label htmlFor="address_1">Adres</label>
                <input
                  id="address_1"
                  required
                  value={address.address_1}
                  onChange={(e) => setAddress((prev) => ({ ...prev, address_1: e.target.value }))}
                />
              </div>
              <div className="fm-form__grid">
                <div className="fm-field">
                  <label htmlFor="city">Şehir</label>
                  <input
                    id="city"
                    required
                    value={address.city}
                    onChange={(e) => setAddress((prev) => ({ ...prev, city: e.target.value }))}
                  />
                </div>
                <div className="fm-field">
                  <label htmlFor="postal_code">Posta kodu</label>
                  <input
                    id="postal_code"
                    required
                    value={address.postal_code}
                    onChange={(e) => setAddress((prev) => ({ ...prev, postal_code: e.target.value }))}
                  />
                </div>
              </div>
              <div className="fm-field">
                <label htmlFor="phone">Telefon</label>
                <input
                  id="phone"
                  required
                  value={address.phone}
                  onChange={(e) => setAddress((prev) => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <button type="submit" className="fm-button fm-button--primary" disabled={busy === 'address'}>
                {busy === 'address' ? 'kaydediliyor…' : 'adresi kaydet'}
              </button>
            </form>
          </section>
        )}

        {hasAddress && !hasShipping && shippingOptions && (
          <section style={{ marginTop: 24 }}>
            <h2>Kargo</h2>
            {Object.entries(shippingOptions).map(([sellerId, options]) => (
              <div className="fm-seller-group" key={sellerId} style={{ marginBottom: 12 }}>
                <h3>{sellerNames[sellerId] ?? 'Satıcı'}</h3>
                {options.map((option) => (
                  <label className="fm-radio-option" key={option.id}>
                    <span>
                      <input
                        type="radio"
                        name={`shipping-${sellerId}`}
                        checked={selectedShipping[sellerId] === option.id}
                        onChange={() => setSelectedShipping((prev) => ({ ...prev, [sellerId]: option.id }))}
                      />{' '}
                      {option.name}
                    </span>
                    <span>{money(option.amount, cart.currency_code)}</span>
                  </label>
                ))}
              </div>
            ))}
            <button
              type="button"
              className="fm-button fm-button--primary"
              disabled={busy === 'shipping'}
              onClick={confirmShipping}
            >
              {busy === 'shipping' ? 'kaydediliyor…' : 'kargo yöntemini onayla'}
            </button>
          </section>
        )}

        {hasShipping && !hasPayment && (
          <section style={{ marginTop: 24 }}>
            <h2>Ödeme</h2>
            <p className="fm-small fm-muted">Bu ortamda tek ödeme sağlayıcısı etkin.</p>
            <button
              type="button"
              className="fm-button fm-button--primary"
              disabled={!providerId || busy === 'payment'}
              onClick={confirmPayment}
            >
              {busy === 'payment' ? 'başlatılıyor…' : 'ödeme yöntemini onayla'}
            </button>
          </section>
        )}
      </div>

      <aside className="fm-summary-card">
        <h2>Özet</h2>
        <div className="fm-summary-row">
          <span>Ara toplam</span>
          <span>{money(cart.item_total, cart.currency_code)}</span>
        </div>
        <div className="fm-summary-row">
          <span>Kargo</span>
          <span>{money(cart.shipping_total, cart.currency_code)}</span>
        </div>
        <div className="fm-summary-row fm-summary-row--total">
          <span>Toplam</span>
          <span>{money(cart.total, cart.currency_code)}</span>
        </div>
        {error && <p className="fm-notice">{error}</p>}
        <button
          type="button"
          className="fm-button fm-button--primary fm-button--full"
          disabled={!canPlaceOrder || busy === 'complete'}
          onClick={placeOrder}
        >
          {busy === 'complete' ? 'gönderiliyor…' : 'siparişi tamamla'}
        </button>
        <p className="fm-small fm-muted">
          <i className="ti ti-shield-check" aria-hidden="true" /> Ödemeniz teslimat onaylanana kadar güvencededir.
        </p>
      </aside>
    </div>
  );
}
