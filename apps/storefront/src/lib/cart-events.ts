export const CART_UPDATED_EVENT = 'fm:cart-updated';

/** Sepet değiştiğinde (ekleme/silme) header'daki sayaç gibi dinleyicileri uyarır. */
export function notifyCartUpdated() {
  window.dispatchEvent(new Event(CART_UPDATED_EVENT));
}
