import { useCallback, useEffect, useState } from 'react';
import { getStoredCartId } from '../lib/cart-storage';
import { CART_UPDATED_EVENT } from '../lib/cart-events';
import { sdk } from '../lib/sdk';

export default function CartCount() {
  const [count, setCount] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    const cartId = getStoredCartId();
    if (!cartId) {
      setCount(0);
      return;
    }
    try {
      const { cart } = await sdk.store.cart.retrieve(cartId, { fields: 'items.quantity' });
      setCount(cart.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0);
    } catch {
      // Sepet süresi dolmuş/silinmiş olabilir — sessizce sıfırla
      setCount(0);
    }
  }, []);

  useEffect(() => {
    void refresh();
    window.addEventListener(CART_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(CART_UPDATED_EVENT, refresh);
  }, [refresh]);

  if (!count) {
    return null;
  }

  return (
    <span className="fm-cart-badge" aria-live="polite">
      {count}
    </span>
  );
}
