import { useState, type ChangeEvent, type FormEvent } from 'react';
import type { AnalysisResult } from '../lib/analysis-types';
import { getOrCreateCartId } from '../lib/cart-helpers';
import { addOfferToCart } from '../lib/mercur-custom';
import { notifyCartUpdated } from '../lib/cart-events';
import { sdk } from '../lib/sdk';
import { duration, money } from '../lib/format';

const MATERIALS = ['PLA', 'PETG', 'ABS', 'ASA', 'TPU'];

export default function CustomDesignForm() {
  const [file, setFile] = useState<File | null>(null);
  const [material, setMaterial] = useState('PLA');
  const [infill, setInfill] = useState(20);
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [designName, setDesignName] = useState('');
  const [addStatus, setAddStatus] = useState<'idle' | 'adding' | 'added' | 'error'>('idle');

  // Analiz girdisi değişirse sonuç artık geçerli değil — sepete ekleme de geçersizleşir
  function invalidateResult() {
    setResult(null);
    setAddStatus('idle');
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    invalidateResult();
  }
  function onMaterialChange(event: ChangeEvent<HTMLSelectElement>) {
    setMaterial(event.target.value);
    invalidateResult();
  }
  function onQuantityChange(event: ChangeEvent<HTMLInputElement>) {
    setQuantity(Number(event.target.value));
    invalidateResult();
  }
  function onInfillChange(event: ChangeEvent<HTMLInputElement>) {
    setInfill(Number(event.target.value));
    invalidateResult();
  }

  async function analyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;
    setStatus('loading');
    setErrorMessage(null);
    setResult(null);

    const form = new FormData();
    form.set('file', file);
    form.set('material', material);
    form.set('infill_percent', String(infill));
    form.set('layer_height_mm', '0.2');
    form.set('quantity', String(quantity));

    try {
      const response = await fetch('/api/analyze', { method: 'POST', body: form });
      const body = await response.json();
      if (!response.ok) {
        setErrorMessage(body.message ?? body.detail?.[0]?.msg ?? 'Dosya analiz edilemedi.');
        setStatus('error');
        return;
      }
      setResult(body as AnalysisResult);
      setStatus('idle');
    } catch {
      setErrorMessage('Geometri servisine ulaşılamadı, daha sonra tekrar deneyin.');
      setStatus('error');
    }
  }

  async function addToCart(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!result) return;
    setAddStatus('adding');
    try {
      const response = await fetch('/api/custom-design', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: designName.trim(), analysis: result }),
      });
      const body = await response.json();
      if (!response.ok || !body.offer_id) {
        setAddStatus('error');
        return;
      }
      const { regions } = await sdk.store.region.list();
      const region = regions.find((r) => r.currency_code === 'try') ?? regions[0];
      const cartId = await getOrCreateCartId(region.id);
      await addOfferToCart(cartId, body.offer_id, 1);
      notifyCartUpdated();
      setAddStatus('added');
    } catch {
      setAddStatus('error');
    }
  }

  const usedPercent = result ? result.estimate.material_efficiency_percent : 100;

  return (
    <div className="fm-pdp">
      <form className="fm-form" onSubmit={analyze}>
        <div className="fm-field">
          <label htmlFor="file">STL veya OBJ dosyası</label>
          <div className="fm-upload-area__wrapper">
            <div className="fm-upload-area">
              <i className="ti ti-file-3d" aria-hidden="true" />
              <span className="fm-upload-area__label">
                {file ? file.name : 'Dosya seçin veya buraya sürükleyin'}
              </span>
              <span className="fm-upload-area__hint">.stl veya .obj — maks. 50 MB</span>
              <input
                id="file"
                type="file"
                accept=".stl,.obj"
                required
                onChange={onFileChange}
                aria-label="STL veya OBJ dosyası seç"
              />
            </div>
          </div>
        </div>

        <div className="fm-form__grid">
          <div className="fm-field">
            <label htmlFor="material">Malzeme</label>
            <select id="material" value={material} onChange={onMaterialChange}>
              {MATERIALS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className="fm-field">
            <label htmlFor="quantity">Adet</label>
            <input
              id="quantity"
              type="number"
              min={1}
              max={1000}
              value={quantity}
              onChange={onQuantityChange}
            />
          </div>
        </div>

        <div className="fm-field">
          <label htmlFor="infill">Doluluk oranı: %{infill}</label>
          <input
            id="infill"
            type="range"
            min={5}
            max={100}
            step={5}
            value={infill}
            onChange={onInfillChange}
          />
        </div>

        <button type="submit" className="fm-button fm-button--primary" disabled={!file || status === 'loading'}>
          {status === 'loading' ? (
            <>
              <i className="ti ti-loader-2 fm-spin" aria-hidden="true" /> analiz ediliyor…
            </>
          ) : (
            <>
              <i className="ti ti-calculator" aria-hidden="true" /> fiyat tahmini al
            </>
          )}
        </button>

        {errorMessage && <p className="fm-notice">{errorMessage}</p>}
      </form>

      <div className="fm-pdp__info">
        {!result && !errorMessage && (
          <p className="fm-muted">Dosyanızı yükleyip "fiyat tahmini al"a basın — sonuç birkaç saniyede burada görünür.</p>
        )}

        {result && (
          <>
            {!result.manufacturability.manufacturable && (
              <p className="fm-notice">
                Bu dosya şu haliyle üretilemez:{' '}
                {result.manufacturability.issues
                  .filter((i) => i.severity === 'error')
                  .map((i) => i.message)
                  .join('; ')}
              </p>
            )}

            <p className="fm-pdp__price">{money(result.cost.total_cost, result.cost.currency)}</p>
            <p className="fm-small fm-muted">
              {quantity} adet · birim {money(result.cost.unit_cost, result.cost.currency)}
            </p>

            <div className="fm-form">
              <label className="fm-small" style={{ fontWeight: 500 }}>
                Malzeme verimliliği
              </label>
              <div
                className="fm-material-bar"
                role="img"
                aria-label={`Malzemenin yüzde ${Math.round(usedPercent)} kadarı ürüne gidiyor`}
              >
                <div className="fm-material-bar__used" style={{ width: `${usedPercent}%` }} />
                <div className="fm-material-bar__waste" style={{ width: `${100 - usedPercent}%` }} />
              </div>
              <div className="fm-material-legend">
                <div>
                  <strong>{result.estimate.slicer}</strong>slicer
                </div>
                <div>
                  <strong>{result.estimate.part_weight_g} g</strong>ürün ağırlığı
                </div>
                <div>
                  <strong>{result.estimate.support_weight_g} g</strong>destek ve atık
                </div>
                <div>
                  <strong>{duration(result.estimate.print_time_minutes)}</strong>tahmini baskı süresi
                </div>
              </div>
            </div>

            {result.manufacturability.issues.some((i) => i.severity === 'warning') && (
              <p className="fm-notice fm-notice--info">
                {result.manufacturability.issues
                  .filter((i) => i.severity === 'warning')
                  .map((i) => i.message)
                  .join('; ')}
              </p>
            )}

            {result.manufacturability.manufacturable && (
              <>
                <p className="fm-notice fm-notice--info">
                  Bu, size özel bir üretici tarafından üretilecek bağlayıcı olmayan bir tahmindir; sipariş
                  onayından sonra fiyat kesinleşir.
                </p>
                <form className="fm-form" onSubmit={addToCart}>
                  <div className="fm-field">
                    <label htmlFor="design-name">Tasarım adı</label>
                    <input
                      id="design-name"
                      type="text"
                      required
                      maxLength={120}
                      placeholder="ör. Masa lambası gövdesi v2"
                      value={designName}
                      onChange={(e) => setDesignName(e.target.value)}
                    />
                  </div>
                  <button
                    type="submit"
                    className="fm-button fm-button--primary"
                    disabled={addStatus === 'adding' || !designName.trim()}
                  >
                    {addStatus === 'adding' ? (
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
                    {addStatus === 'added' && (
                      <p className="fm-notice fm-notice--info">
                        Sepete eklendi. <a href="/sepet">sepete git →</a>
                      </p>
                    )}
                    {addStatus === 'error' && (
                      <p className="fm-notice">Sepete eklenemedi, tekrar deneyin.</p>
                    )}
                  </div>
                </form>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
