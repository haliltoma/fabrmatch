import { sdk } from './sdk';
import type { Offer } from './mercur-types';

/**
 * Mercur'un standart Medusa Store API'sini değiştirdiği veya genişlettiği uçlar.
 * `sdk.store.*` bunları tanımıyor (tipleri `@medusajs/types` vanilla Medusa'dan
 * geliyor) — building-storefronts kuralı gereği bu uçlar için `sdk.client.fetch()`
 * kullanılır, JSON.stringify YAPILMAZ.
 */

export async function listOffersForVariant(variantId: string, regionId: string): Promise<Offer[]> {
  // calculated_price bir fiyatlandırma bağlamı ister (products ucuyla aynı kural)
  const { offers } = await sdk.client.fetch<{ offers: Offer[] }>('/store/offers', {
    query: { variant_id: variantId, region_id: regionId, fields: '+calculated_price', limit: 50 },
  });
  return offers;
}

/**
 * Mercur'un satır kalemi ekleme ucu `variant_id` değil `offer_id` bekler (Medusa'nın
 * standart davranışının üstüne yazılmış) — bu yüzden `sdk.store.cart.createLineItem`
 * (tipi `variant_id` istiyor) yerine burada elle çağrılır.
 */
export async function addOfferToCart(cartId: string, offerId: string, quantity: number) {
  return sdk.client.fetch<{ cart: unknown }>(`/store/carts/${cartId}/line-items`, {
    method: 'POST',
    body: { offer_id: offerId, quantity },
  });
}

/**
 * Sepet-müşteri bağlama `sdk.store.cart.update` ile OLMAZ (şema customer_id kabul
 * etmez) — `POST /store/carts/:id/customer` authenticated müşteriden customer_id
 * alır ve sepet e-postasını üzerine yazar.
 */
export async function transferCart(cartId: string) {
  return sdk.client.fetch<{ cart: unknown }>(`/store/carts/${cartId}/customer`, {
    method: 'POST',
  });
}

export type ShippingOption = {
  id: string;
  name: string;
  price_type: string;
  provider_id: string;
  amount: number;
  type: { label: string; code: string };
};

/**
 * Vanilla Medusa `/store/shipping-options` düz bir dizi döner; Mercur bunu
 * satıcı ID'sine göre gruplanmış bir nesneye çeviriyor (bkz. docs:
 * list-shipping-options.mdx) — `sdk.store.fulfillment.listCartOptions`'ın tipi
 * (vanilla) bunu yansıtmıyor, elle çağrılır.
 */
export async function listShippingOptionsBySeller(cartId: string): Promise<Record<string, ShippingOption[]>> {
  const { shipping_options } = await sdk.client.fetch<{ shipping_options: Record<string, ShippingOption[]> }>(
    '/store/shipping-options',
    { query: { cart_id: cartId } }
  );
  return shipping_options;
}

export async function getSellerNames(sellerIds: string[]): Promise<Record<string, string>> {
  if (sellerIds.length === 0) return {};
  const { sellers } = await sdk.client.fetch<{ sellers: { id: string; name: string }[] }>('/store/sellers', {
    query: { id: sellerIds, limit: sellerIds.length },
  });
  return Object.fromEntries(sellers.map((seller) => [seller.id, seller.name]));
}

export type OrderGroupCompleteResponse =
  | { type: 'order_group'; order_group: { id: string; customer_id?: string; seller_count: number; total: number } }
  | { type: 'cart'; cart: { id: string; total: number }; error: { message: string; type: string } };

/**
 * `sdk.store.cart.complete()` yanıt tipini vanilla Medusa siparişi olarak varsayar;
 * Mercur bunu `order_group`'a çeviriyor (bkz. docs: complete-cart.mdx) — elle çağrılır.
 */
export async function completeCart(cartId: string): Promise<OrderGroupCompleteResponse> {
  return sdk.client.fetch<OrderGroupCompleteResponse>(`/store/carts/${cartId}/complete`, {
    method: 'POST',
  });
}

export type OrderGroupItem = {
  id: string;
  title: string;
  subtitle: string | null;
  product_title: string;
  variant_title: string | null;
  thumbnail: string | null;
  quantity: number;
  unit_price: number;
  total: number;
  variant?: { product?: { handle?: string; title?: string } } | null;
};

export type OrderGroupOrder = {
  id: string;
  display_id: number;
  /** Mercur'un order modeli tek `status` alanı taşır (fulfillment/payment status yok). */
  status: string;
  currency_code: string;
  total: number;
  item_total: number;
  shipping_total: number;
  items: OrderGroupItem[];
  seller: { id: string; name: string; handle: string; logo: string | null };
};

export type OrderGroup = {
  id: string;
  display_id: number;
  customer_id?: string;
  total: number;
  seller_count: number;
  created_at: string;
  orders: OrderGroupOrder[];
};

/**
 * Mercur'un varsayılan fields listesi Medusa'nın "en fazla 3 ilişki" sınırını
 * aşıyor (400 döner), bu yüzden ilişki sayısı 3'te kalan curated bir liste
 * gönderilir: orders, orders.seller, orders.items. Ürün handle kalemin kendi
 * `product_handle` alanından gelir (variant.product genişletmesine gerek yok).
 */
const ORDER_GROUP_FIELDS = [
  'id',
  'display_id',
  'customer_id',
  'seller_count',
  'total',
  'created_at',
  'orders.id',
  'orders.display_id',
  'orders.status',
  'orders.currency_code',
  'orders.total',
  'orders.item_total',
  'orders.shipping_total',
  'orders.seller_id',
  'orders.seller.id',
  'orders.seller.name',
  'orders.seller.handle',
  'orders.seller.logo',
  'orders.items.id',
  'orders.items.title',
  'orders.items.subtitle',
  'orders.items.thumbnail',
  'orders.items.product_title',
  'orders.items.product_handle',
  'orders.items.variant_title',
  'orders.items.quantity',
  'orders.items.unit_price',
  'orders.items.total',
].join(',');

/**
 * Mercur `GET /store/order-groups` customer'a göre kapsamlıdır.
 * Yabancı (başkasının) id → 404 → null.
 */
export async function listOrderGroups(limit = 20, offset = 0): Promise<OrderGroup[]> {
  const { order_groups } = await sdk.client.fetch<{ order_groups: OrderGroup[] }>('/store/order-groups', {
    query: { limit, offset, fields: ORDER_GROUP_FIELDS },
  });
  return order_groups;
}

export async function getOrderGroup(id: string): Promise<OrderGroup | null> {
  try {
    const { order_group } = await sdk.client.fetch<{ order_group: OrderGroup }>(`/store/order-groups/${id}`, {
      query: { fields: ORDER_GROUP_FIELDS },
    });
    return order_group;
  } catch {
    return null;
  }
}
