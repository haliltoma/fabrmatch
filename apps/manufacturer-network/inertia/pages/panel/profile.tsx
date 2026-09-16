import { Form } from '@adonisjs/inertia/react'
import type { InertiaProps } from '~/types'

type ManufacturerProfile = {
  displayName: string
  publicCode: string
  status: string
  city: string
  countryCode: string
  materials: string[]
  maxBuildXMm: number
  maxBuildYMm: number
  maxBuildZMm: number
  dailyCapacityGrams: number
  pricePerGram: number
  hourlyRate: number
  completedOrders: number
  onTimeRate: number | null
  stripeAccountId: string | null
}

type Props = InertiaProps<{
  manufacturer: ManufacturerProfile
  materials: string[]
}>

function Field({
  name,
  label,
  errors,
  hint,
  type = 'text',
  step,
  defaultValue,
  placeholder,
}: {
  name: string
  label: string
  errors: Record<string, string | undefined>
  hint?: string
  type?: string
  step?: string
  defaultValue?: string | number
  placeholder?: string
}) {
  return (
    <div className="fm-field">
      <label htmlFor={name}>{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        step={step}
        defaultValue={defaultValue !== undefined ? String(defaultValue) : undefined}
        placeholder={placeholder}
        data-invalid={errors[name] ? 'true' : undefined}
      />
      {hint && <p className="fm-field__hint">{hint}</p>}
      {errors[name] && <p className="fm-field__error">{errors[name]}</p>}
    </div>
  )
}

export default function Profile({ manufacturer, materials }: Props) {
  const onTimePercent = manufacturer.onTimeRate != null
    ? Math.round(manufacturer.onTimeRate * 100)
    : null

  return (
    <div className="fm-page">
      <div className="fm-page__head">
        <div>
          <h1>Profil & kapasite</h1>
          <p className="fm-small fm-muted" style={{ marginTop: 4 }}>
            <span className="fm-badge fm-badge--honey">{manufacturer.publicCode}</span>
            {' · '}alıcılar sizi bu kodla tanır
          </p>
        </div>
        <span
          className="fm-badge"
          style={
            manufacturer.status === 'active'
              ? { background: 'var(--fm-sage-bg)', color: 'var(--fm-sage-text)', border: 'none' }
              : { background: 'var(--fm-honey-bg)', color: 'var(--fm-honey-text)', border: 'none' }
          }
        >
          <i className={`ti ${manufacturer.status === 'active' ? 'ti-circle-check' : 'ti-clock'}`} aria-hidden="true" />
          {manufacturer.status === 'active' ? 'aktif' : 'onay bekliyor'}
        </span>
      </div>

      {/* ── Performans özeti ── */}
      <div className="fm-summary-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        <div className="fm-summary-card">
          <div className="fm-summary-card__label">Tamamlanan siparişler</div>
          <div className="fm-summary-card__value">{manufacturer.completedOrders}</div>
        </div>
        <div className="fm-summary-card">
          <div className="fm-summary-card__label">Zamanında teslimat oranı</div>
          <div className="fm-summary-card__value">
            {onTimePercent != null ? `%${onTimePercent}` : '—'}
          </div>
          <div className="fm-summary-card__sub">
            {onTimePercent != null ? (onTimePercent >= 90 ? 'mükemmel' : onTimePercent >= 75 ? 'iyi' : 'geliştirilebilir') : 'henüz veri yok'}
          </div>
        </div>
      </div>

      {/* ── Stripe durumu ── */}
      <div className="fm-card" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--sp-3)' }}>
        <div style={{ display: 'flex', gap: 'var(--sp-3)', alignItems: 'center' }}>
          <i className="ti ti-credit-card" aria-hidden="true" style={{ fontSize: 22, color: 'var(--fm-honey-solid)' }} />
          <div>
            <p style={{ fontWeight: 500 }}>Stripe ödeme hesabı</p>
            <p className="fm-small fm-muted">
              {manufacturer.stripeAccountId
                ? `Bağlı: ${manufacturer.stripeAccountId}`
                : 'Henüz bağlanmadı — ödeme almak için platform desteğiyle iletişime geçin'}
            </p>
          </div>
        </div>
        {manufacturer.stripeAccountId ? (
          <span className="fm-badge" style={{ background: 'var(--fm-sage-bg)', color: 'var(--fm-sage-text)', border: 'none' }}>
            <i className="ti ti-circle-check" aria-hidden="true" /> bağlı
          </span>
        ) : (
          <span className="fm-badge" style={{ background: 'var(--fm-danger-bg)', color: 'var(--fm-danger-text)', border: 'none' }}>
            bağlı değil
          </span>
        )}
      </div>

      {/* ── Profil düzenleme formu ── */}
      <section className="fm-card">
        <h2>Atölye bilgileri</h2>
        <Form route="panel.profile.update" className="fm-form">
          {({ errors, processing }) => (
            <>
              {/* Temel bilgiler */}
              <div className="fm-form__grid">
                <Field
                  name="displayName"
                  label="Atölye adı"
                  errors={errors}
                  defaultValue={manufacturer.displayName}
                />
                <Field
                  name="city"
                  label="Şehir"
                  errors={errors}
                  defaultValue={manufacturer.city}
                />
                <Field
                  name="countryCode"
                  label="Ülke kodu"
                  errors={errors}
                  defaultValue={manufacturer.countryCode}
                  hint="İki harf, ör. TR"
                />
              </div>

              {/* Malzeme seçimi */}
              <div className="fm-field">
                <label>Basabildiğiniz malzemeler</label>
                <div className="fm-checkboxes">
                  {materials.map((material) => (
                    <label key={material}>
                      <input
                        type="checkbox"
                        name="materials[]"
                        value={material}
                        defaultChecked={manufacturer.materials.includes(material)}
                      />
                      {' '}{material}
                    </label>
                  ))}
                </div>
                {errors.materials && <p className="fm-field__error">{errors.materials}</p>}
              </div>

              {/* Yazıcı boyutları */}
              <h3 style={{ marginTop: 'var(--sp-2)' }}>Yazıcı ve kapasite</h3>
              <div className="fm-form__grid">
                <Field
                  name="maxBuildXMm"
                  label="Baskı alanı X (mm)"
                  type="number"
                  errors={errors}
                  defaultValue={manufacturer.maxBuildXMm}
                />
                <Field
                  name="maxBuildYMm"
                  label="Baskı alanı Y (mm)"
                  type="number"
                  errors={errors}
                  defaultValue={manufacturer.maxBuildYMm}
                />
                <Field
                  name="maxBuildZMm"
                  label="Baskı alanı Z (mm)"
                  type="number"
                  errors={errors}
                  defaultValue={manufacturer.maxBuildZMm}
                />
                <Field
                  name="dailyCapacityGrams"
                  label="Günlük kapasite (gram)"
                  type="number"
                  errors={errors}
                  defaultValue={manufacturer.dailyCapacityGrams}
                  hint="Tüm yazıcılarınızla bir günde basabileceğiniz toplam malzeme"
                />
              </div>

              {/* Ücretlendirme */}
              <h3 style={{ marginTop: 'var(--sp-2)' }}>Ücretlendirme</h3>
              <div className="fm-form__grid">
                <Field
                  name="pricePerGram"
                  label="Gram başına ücret (TRY)"
                  type="number"
                  step="0.01"
                  errors={errors}
                  defaultValue={manufacturer.pricePerGram}
                />
                <Field
                  name="hourlyRate"
                  label="Saatlik makine ücreti (TRY)"
                  type="number"
                  step="0.01"
                  errors={errors}
                  defaultValue={manufacturer.hourlyRate}
                />
              </div>

              <div>
                <button type="submit" className="fm-button fm-button--primary" disabled={processing}>
                  <i className="ti ti-device-floppy" aria-hidden="true" /> değişiklikleri kaydet
                </button>
              </div>
            </>
          )}
        </Form>
      </section>
    </div>
  )
}
