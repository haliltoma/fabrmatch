const CART_KEY = 'fabrmatch_cart_id';

/**
 * Tek bölgeli (TRY) MVP: sepet kimliği tarayıcıda saklanır. Çoklu bölge/dil desteği
 * eklendiğinde bölge başına ayrı anahtar gerekecek (bkz. docs/07 kararı).
 */
export function getStoredCartId(): string | null {
  try {
    return localStorage.getItem(CART_KEY);
  } catch {
    return null;
  }
}

export function setStoredCartId(cartId: string) {
  try {
    localStorage.setItem(CART_KEY, cartId);
  } catch {
    // localStorage kapalıysa (özel pencere) sepet kalıcı olmaz — sessizce geç
  }
}

export function clearStoredCartId() {
  try {
    localStorage.removeItem(CART_KEY);
  } catch {
    // yok say
  }
}
