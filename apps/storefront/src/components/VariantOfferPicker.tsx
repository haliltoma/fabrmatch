import { useEffect, useMemo, useState } from 'react';
import { addOfferToCart, listOffersForVariant } from '../lib/mercur-custom';
import { getOrCreateCartId } from '../lib/cart-helpers';
import { notifyCartUpdated } from '../lib/cart-events';
import { money } from '../lib/format';
import type { Product, Variant } from '../lib/store-data';

type Props = { product: Product; regionId: string };

function matchesSelection(variant: Variant, selection: Record<string, string>) {
  return variant.options.every((option) => {
    const title = option.option?.title;
    return !title || selection[title] === option.value;
  });
}

export default function VariantOfferPicker({ product, regionId }: Props) {
  const [selection, setSelection] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const option of product.options) {
      initial[option.title] = option.values[0]?.value ?? '';
    }
    return initial;
  });
  const [otherOffers, setOtherOffers] = useState<
    Awaited<ReturnType<typeof listOffersForVariant>> | null
  >(null);
  const [status, setStatus] = useState<'idle' | 'adding' | 'added' | 'error'>('idle');

  const variant = useMemo(
    () => product.variants.find((v) => matchesSelection(v, selection)) ?? null,
    [product.variants, selection]
  );

  useEffect(() => {
    setOtherOffers(null);
    setStatus('idle');
    if (!variant) return;
    let cancelled = false;
    listOffersForVariant(variant.id, regionId)
      .then((offers) => {
        if (!cancelled) setOtherOffers(offers.filter((offer) => offer.id !== variant.offer_id));
      })
      .catch(() => {
        if (!cancelled) setOtherOffers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [variant, regionId]);

  async function addOffer(offerId: string) {
    setStatus('adding');
    try {
      const cartId = await getOrCreateCartId(regionId);
      await addOfferToCart(cartId, offerId, 1);
      notifyCartUpdated();
      setStatus('added');
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="fm-form">
      {product.options.map((option) => (
        <div className="fm-option-group" key={option.id}>
          <label>{option.title}</label>
          <div className="fm-option-row" role="group" aria-label={option.title}>
            {option.values.map((value) => {
              const active = selection[option.title] === value.value;
              const wouldMatch = product.variants.some((v) =>
                matchesSelection(v, { ...selection, [option.title]: value.value })
              );
              return (
                <button
                  key={value.value}
                  type="button"
                  className="fm-option-chip"
                  aria-pressed={active}
                  disabled={!wouldMatch}
                  onClick={() => setSelection((prev) => ({ ...prev, [option.title]: value.value }))}
                >
                  {value.value}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {!variant && <p className="fm-notice">Bu kombinasyon için varyant bulunamadı.</p>}

      {variant && (
        <>
          {variant.calculated_price && (
            <p className="fm-pdp__price">
              {money(variant.calculated_price.calculated_amount, variant.calculated_price.currency_code)}
            </p>
          )}

          <button
            type="button"
            className="fm-button fm-button--primary fm-button--full"
            disabled={!variant.offer_id || status === 'adding'}
            onClick={() => variant.offer_id && addOffer(variant.offer_id)}
          >
            {status === 'adding' ? (
              <>
                <i className="ti ti-loader-2 fm-spin" aria-hidden="true" /> ekleniyor…
              </>
            ) : (
              <>
                <i className="ti ti-shopping-bag" aria-hidden="true" /> sepete ekle
              </>
            )}
          </button>

          <div role="status" aria-live="polite">
            {status === 'added' && (
              <p className="fm-notice fm-notice--info">
                Sepete eklendi. <a href="/sepet">sepete git →</a>
              </p>
            )}
            {status === 'error' && <p className="fm-notice">Sepete eklenemedi, tekrar deneyin.</p>}
          </div>

          {otherOffers && otherOffers.length > 0 && (
            <div className="fm-option-group">
              <label>Diğer satıcılar</label>
              <ul className="fm-offer-list">
                {otherOffers.map((offer) => (
                  <li key={offer.id} className="fm-offer-row">
                    <span className="fm-offer-row__seller">{offer.seller.name}</span>
                    <span>
                      {offer.calculated_price
                        ? money(offer.calculated_price.calculated_amount, offer.calculated_price.currency_code)
                        : '—'}
                    </span>
                    <button type="button" className="fm-button" onClick={() => addOffer(offer.id)}>
                      sepete ekle
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
