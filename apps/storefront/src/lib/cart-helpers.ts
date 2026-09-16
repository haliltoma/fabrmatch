import { sdk } from './sdk';
import { getStoredCartId, setStoredCartId } from './cart-storage';

/**
 * Saklı sepeti doğrular, yoksa/geçersizse verilen bölgede yenisini oluşturur.
 * VariantOfferPicker ve CustomDesignForm tarafından paylaşılır.
 */
export async function getOrCreateCartId(regionId: string): Promise<string> {
  const existing = getStoredCartId();
  if (existing) {
    try {
      await sdk.store.cart.retrieve(existing, { fields: 'id' });
      return existing;
    } catch {
      // sepet artık yok (ör. süresi doldu) — yenisi oluşturulacak
    }
  }
  const { cart } = await sdk.store.cart.create({ region_id: regionId });
  setStoredCartId(cart.id);
  return cart.id;
}
