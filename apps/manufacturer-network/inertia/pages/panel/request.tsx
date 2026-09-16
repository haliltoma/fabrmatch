import { Form, Link } from '@adonisjs/inertia/react'
import { date, duration, money, statusLabel } from '~/lib/format'
import type { JobDetail } from '~/lib/panel_types'
import type { InertiaProps } from '~/types'
import { DateTime } from 'luxon'

type Props = InertiaProps<{ job: JobDetail; openOfferId: number | null }>

const STEPS = [
  { status: 'accepted',       label: 'teklif kabul edildi',                   icon: 'ti-check' },
  { status: 'in_production',  label: 'üretime başlandı',                      icon: 'ti-printer' },
  { status: 'quality_check',  label: 'kalite kontrol fotoğrafları yüklendi',   icon: 'ti-clipboard-check' },
  { status: 'shipped',        label: 'kargoya verildi',                        icon: 'ti-truck' },
  { status: 'delivered',      label: 'teslim edildi',                          icon: 'ti-package' },
] as const

function MaterialEfficiency({ job }: { job: JobDetail }) {
  const estimate = job.printEstimate
  if (!estimate) {
    return <p className="fm-small fm-muted">Bu iş için baskı tahmini gönderilmedi.</p>
  }
  const total = estimate.part_weight_g + estimate.support_weight_g
  const usedPercent = total === 0 ? 100 : (estimate.part_weight_g / total) * 100

  return (
    <div className="fm-form">
      <div
        className="fm-material-bar"
        role="img"
        aria-label={`Malzemenin yüzde ${Math.round(usedPercent)} kadarı ürüne gidiyor`}
      >
        <div className="fm-material-bar__used" style={{ width: `${usedPercent}%` }} />
        <div className="fm-material-bar__waste" style={{ width: `${100 - usedPercent}%` }} />
      </div>
      <div className="fm-material-legend">
        <div><strong>{estimate.slicer}</strong>slicer</div>
        <div><strong>{estimate.part_weight_g} g</strong>ürün ağırlığı</div>
        <div><strong>{estimate.support_weight_g} g</strong>destek ve atık</div>
        <div><strong>{duration(estimate.print_time_minutes)}</strong>tahmini baskı süresi</div>
      </div>
    </div>
  )
}

/** Kalite fotoğraflarını URL listesinden galeri olarak göster */
function PhotoGallery({ photos }: { photos: string[] }) {
  if (photos.length === 0) return null
  return (
    <div>
      <p className="fm-small fm-muted" style={{ marginBottom: 'var(--sp-2)' }}>
        <i className="ti ti-photo" aria-hidden="true" /> {photos.length} fotoğraf yüklendi
      </p>
      <div className="fm-photo-gallery">
        {photos.map((url, i) => (
          <a
            key={i}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="fm-photo-gallery__item"
            title={`Fotoğraf ${i + 1}`}
          >
            <img
              src={url}
              alt={`Kalite kontrol fotoğrafı ${i + 1}`}
              loading="lazy"
              onError={(e) => {
                // URL geçerli ama görsel yüklenemiyorsa ikon göster
                const el = e.currentTarget
                el.style.display = 'none'
                el.parentElement!.classList.add('fm-photo-gallery__placeholder')
                el.parentElement!.innerHTML = '<i class="ti ti-photo-off" aria-hidden="true"></i>'
              }}
            />
          </a>
        ))}
      </div>
    </div>
  )
}

function NextStep({ job, openOfferId }: { job: JobDetail; openOfferId: number | null }) {
  if (job.status === 'awaiting_acceptance' && openOfferId !== null) {
    return (
      <div className="fm-actions">
        <Form route="panel.offers.accept" routeParams={{ id: openOfferId }}>
          {({ processing }) => (
            <button type="submit" className="fm-button fm-button--primary" disabled={processing}>
              <i className="ti ti-check" aria-hidden="true" /> teklifi kabul et
            </button>
          )}
        </Form>
        <Form route="panel.offers.decline" routeParams={{ id: openOfferId }}>
          {({ processing }) => (
            <button type="submit" className="fm-button" disabled={processing}>
              <i className="ti ti-x" aria-hidden="true" /> reddet
            </button>
          )}
        </Form>
      </div>
    )
  }

  if (job.status === 'accepted') {
    return (
      <Form route="panel.requests.steps.store" routeParams={{ id: job.id }}>
        {({ processing }) => (
          <>
            <input type="hidden" name="status" value="in_production" />
            <button type="submit" className="fm-button fm-button--primary" disabled={processing}>
              <i className="ti ti-printer" aria-hidden="true" /> üretime başladım
            </button>
          </>
        )}
      </Form>
    )
  }

  if (job.status === 'in_production') {
    return (
      <Form route="panel.requests.steps.store" routeParams={{ id: job.id }} className="fm-form">
        {({ errors, processing }) => (
          <>
            <input type="hidden" name="status" value="quality_check" />
            <div className="fm-field">
              <label htmlFor="photos">Kalite kontrol fotoğraf bağlantıları</label>
              <textarea
                id="photos"
                name="photos"
                placeholder="https://drive.google.com/..."
                data-invalid={errors.photos ? 'true' : undefined}
                style={{ minHeight: 96 }}
              />
              <p className="fm-field__hint">
                <i className="ti ti-info-circle" aria-hidden="true" /> Her satıra bir https bağlantısı — en fazla 10 fotoğraf. Anlaşmazlıkta kanıt olarak kullanılır.
              </p>
              {errors.photos && <p className="fm-field__error">{errors.photos}</p>}
            </div>
            <div>
              <button type="submit" className="fm-button fm-button--primary" disabled={processing}>
                <i className="ti ti-clipboard-check" aria-hidden="true" /> kalite kontrolünü gönder
              </button>
            </div>
          </>
        )}
      </Form>
    )
  }

  if (job.status === 'quality_check') {
    return (
      <Form route="panel.requests.steps.store" routeParams={{ id: job.id }} className="fm-form">
        {({ errors, processing }) => (
          <>
            <input type="hidden" name="status" value="shipped" />
            <div className="fm-field">
              <label htmlFor="trackingNumber">Kargo takip numarası</label>
              <input
                id="trackingNumber"
                name="trackingNumber"
                placeholder="1Z999AA10123456784"
                data-invalid={errors.trackingNumber ? 'true' : undefined}
              />
              <p className="fm-field__hint">Alıcıya e-posta ile gönderilecek</p>
              {errors.trackingNumber && <p className="fm-field__error">{errors.trackingNumber}</p>}
            </div>
            <div>
              <button type="submit" className="fm-button fm-button--primary" disabled={processing}>
                <i className="ti ti-truck" aria-hidden="true" /> kargoya verdim
              </button>
            </div>
          </>
        )}
      </Form>
    )
  }

  if (job.status === 'shipped') {
    return (
      <Form route="panel.requests.steps.store" routeParams={{ id: job.id }}>
        {({ processing }) => (
          <>
            <input type="hidden" name="status" value="delivered" />
            <button type="submit" className="fm-button fm-button--primary" disabled={processing}>
              <i className="ti ti-package" aria-hidden="true" /> teslim edildi olarak işaretle
            </button>
          </>
        )}
      </Form>
    )
  }

  if (job.status === 'delivered') {
    return (
      <div className="fm-card fm-card--honey" style={{ padding: 'var(--sp-3) var(--sp-4)' }}>
        <div style={{ display: 'flex', gap: 'var(--sp-2)', alignItems: 'center' }}>
          <i className="ti ti-circle-check" aria-hidden="true" style={{ fontSize: 20, color: 'var(--fm-sage-solid)' }} />
          <div>
            <p style={{ fontWeight: 500 }}>Sipariş tamamlandı</p>
            {job.deliveredAt && (
              <p className="fm-small" style={{ marginTop: 2 }}>
                Teslim tarihi: {date(job.deliveredAt)}
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  return null
}

function daysUntil(isoDate: string) {
  return Math.ceil(DateTime.fromISO(isoDate).diffNow('days').days)
}

export default function RequestDetail({ job, openOfferId }: Props) {
  const reached = STEPS.findIndex((step) => step.status === job.status)
  const daysLeft = daysUntil(job.requestedDeliveryBy)

  return (
    <div className="fm-page">
      {/* ── Breadcrumb ── */}
      <div className="fm-breadcrumb">
        <Link route="panel.index">
          <i className="ti ti-layout-dashboard" aria-hidden="true" /> panel
        </Link>
        <span className="fm-breadcrumb__sep">/</span>
        <span>{job.designReference}</span>
      </div>

      {/* ── Başlık ── */}
      <div className="fm-page__head">
        <div>
          <h1>{job.designReference}</h1>
          <p className="fm-small fm-muted" style={{ marginTop: 4 }}>
            {job.quantity} adet · {job.material}
            {job.color ? ` · ${job.color}` : ''} · {job.buyerCity ?? job.buyerCountry}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--sp-2)', alignItems: 'center', flexShrink: 0 }}>
          <span className="fm-badge fm-badge--honey">{statusLabel(job.status)}</span>
          {daysLeft <= 3 && job.status !== 'delivered' && job.status !== 'cancelled' && (
            <span className={`fm-badge ${daysLeft <= 1 ? 'fm-badge--danger' : ''}`}
              style={daysLeft <= 1
                ? { background: 'var(--fm-danger-bg)', color: 'var(--fm-danger-text)', border: 'none' }
                : { background: 'var(--fm-honey-bg)', color: 'var(--fm-honey-text)', border: 'none' }
              }
            >
              <i className="ti ti-alert-triangle" aria-hidden="true" />
              {daysLeft <= 0 ? 'teslim süresi geçti' : daysLeft === 1 ? 'yarın teslim' : `${daysLeft} gün kaldı`}
            </span>
          )}
        </div>
      </div>

      {/* ── Teslim & kazanç bilgisi ── */}
      <div className="fm-summary-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="fm-summary-card">
          <div className="fm-summary-card__label">Teslim tarihi</div>
          <div className={`fm-summary-card__value ${daysLeft <= 1 ? 'fm-deadline--urgent' : daysLeft <= 3 ? 'fm-deadline--soon' : ''}`}
            style={{ fontSize: 16 }}>
            {date(job.requestedDeliveryBy)}
          </div>
          {daysLeft > 0 && job.status !== 'delivered' && (
            <div className="fm-summary-card__sub">{daysLeft} gün kaldı</div>
          )}
        </div>
        <div className="fm-summary-card">
          <div className="fm-summary-card__label">Kazanç</div>
          <div className="fm-summary-card__value" style={{ fontSize: 16, color: 'var(--fm-honey-text)' }}>
            {money(job.payout, job.currencyCode)}
          </div>
          <div className="fm-summary-card__sub">teslimat onayı sonrası ödenir</div>
        </div>
        <div className="fm-summary-card">
          <div className="fm-summary-card__label">Sipariş no</div>
          <div className="fm-summary-card__value" style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 400 }}>
            {job.publicId}
          </div>
        </div>
      </div>

      {/* ── Malzeme verimliliği ── */}
      <section className="fm-card">
        <h2>Malzeme verimliliği</h2>
        <MaterialEfficiency job={job} />
      </section>

      {/* ── Üretim adımları ── */}
      <section className="fm-card">
        <h2>Üretim adımları</h2>
        <ol className="fm-steps">
          {STEPS.map((step, index) => {
            const done = index < reached
            const current = index === reached
            return (
              <li
                key={step.status}
                className={`fm-step ${done ? 'fm-step--done' : ''} ${current ? 'fm-step--current' : ''}`}
              >
                <span className="fm-step__dot" aria-hidden="true">
                  {done ? <i className="ti ti-check" /> : <i className={`ti ${step.icon}`} />}
                </span>
                <span className="fm-step__content">{step.label}</span>
              </li>
            )
          })}
        </ol>

        {/* Kargo takip numarası */}
        {job.trackingNumber && (
          <p className="fm-small fm-muted">
            <i className="ti ti-barcode" aria-hidden="true" /> Takip numarası:{' '}
            <strong style={{ fontWeight: 500 }}>{job.trackingNumber}</strong>
          </p>
        )}

        {/* Kalite fotoğrafları galerisi */}
        {job.productionPhotos.length > 0 && (
          <div style={{ marginTop: 'var(--sp-3)' }}>
            <PhotoGallery photos={job.productionPhotos} />
          </div>
        )}

        {/* Sonraki adım aksiyonu */}
        <div style={{ marginTop: 'var(--sp-3)' }}>
          <NextStep job={job} openOfferId={openOfferId} />
        </div>
      </section>
    </div>
  )
}
