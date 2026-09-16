import { Form, Link } from '@adonisjs/inertia/react'
import { date, money, statusLabel } from '~/lib/format'
import type { JobSummary, ManufacturerSummary, OfferSummary } from '~/lib/panel_types'
import type { InertiaProps } from '~/types'
import { DateTime } from 'luxon'

type Props = InertiaProps<{
  manufacturer: ManufacturerSummary
  offers: OfferSummary[]
  jobs: JobSummary[]
}>

/** Teslim tarihine göre aciliyet sınıfı */
function deadlineClass(isoDate: string) {
  const daysLeft = Math.ceil(DateTime.fromISO(isoDate).diffNow('days').days)
  if (daysLeft <= 1) return 'fm-deadline--urgent'
  if (daysLeft <= 3) return 'fm-deadline--soon'
  return ''
}

function deadlineLabel(isoDate: string) {
  const daysLeft = Math.ceil(DateTime.fromISO(isoDate).diffNow('days').days)
  const formatted = date(isoDate)
  if (daysLeft <= 0) return `${formatted} (geçmiş!)`
  if (daysLeft === 1) return `${formatted} (yarın)`
  if (daysLeft <= 3) return `${formatted} (${daysLeft} gün)`
  return formatted
}

function JobMeta({ job }: { job: JobSummary }) {
  return (
    <div className="fm-meta">
      <span>
        <i className="ti ti-package" aria-hidden="true" /> {job.quantity} adet · {job.material}
        {job.color ? ` · ${job.color}` : ''}
      </span>
      <span>
        <i className="ti ti-map-pin" aria-hidden="true" /> {job.buyerCity ?? job.buyerCountry}
      </span>
      <span className={deadlineClass(job.requestedDeliveryBy)}>
        <i className="ti ti-calendar" aria-hidden="true" /> {deadlineLabel(job.requestedDeliveryBy)}
      </span>
    </div>
  )
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="fm-empty" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sp-2)' }}>
      <i className={`ti ${icon}`} style={{ fontSize: 32, color: 'var(--border)' }} aria-hidden="true" />
      <span>{text}</span>
    </div>
  )
}

export default function Dashboard({ manufacturer, offers, jobs }: Props) {
  return (
    <div className="fm-page">
      {/* ── Sayfa başlığı ── */}
      <div className="fm-page__head">
        <div>
          <h1>Üretim paneli</h1>
          <p className="fm-small fm-muted" style={{ marginTop: 4 }}>
            {manufacturer.displayName}
            {' · '}
            <span className="fm-badge fm-badge--honey">{manufacturer.publicCode}</span>
          </p>
        </div>
        {manufacturer.status === 'active' && (
          <span className="fm-badge fm-badge--sage">
            <i className="ti ti-circle-check" aria-hidden="true" /> aktif
          </span>
        )}
      </div>

      {/* ── Onay bekleniyor uyarısı ── */}
      {manufacturer.status !== 'active' && (
        <div className="fm-card fm-card--honey">
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <i className="ti ti-clock-hour-4" aria-hidden="true" style={{ fontSize: 20, marginTop: 2, flexShrink: 0 }} />
            <div>
              <h3>Başvurunuz inceleniyor</h3>
              <p className="fm-small" style={{ marginTop: 4 }}>
                Profiliniz onaylandığında size uygun işler burada teklif olarak görünecek.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── İstatistik şeridi ── */}
      <div className="fm-stats">
        <div className="fm-stat">
          <i className="ti ti-inbox fm-stat__icon" aria-hidden="true" />
          <div className="fm-stat__label">Açık teklifler</div>
          <div className="fm-stat__value">{offers.length}</div>
        </div>
        <div className="fm-stat">
          <i className="ti ti-loader fm-stat__icon" aria-hidden="true" />
          <div className="fm-stat__label">Devam eden işler</div>
          <div className="fm-stat__value">{jobs.length}</div>
        </div>
        <div className="fm-stat">
          <i className="ti ti-circle-check fm-stat__icon" aria-hidden="true" />
          <div className="fm-stat__label">Tamamlanan siparişler</div>
          <div className="fm-stat__value">{manufacturer.completedOrders}</div>
        </div>
      </div>

      {/* ── Açık teklifler ── */}
      <section className="fm-card">
        <div className="fm-section-head">
          <h2>Size gelen teklifler</h2>
          {offers.length > 0 && (
            <span className="fm-badge fm-badge--honey">{offers.length} bekliyor</span>
          )}
        </div>

        {offers.length === 0 ? (
          <EmptyState icon="ti-inbox" text="Şu an açık teklif yok." />
        ) : (
          <ul className="fm-list">
            {offers.map((offer) => (
              <li key={offer.id} className="fm-list__row">
                <div>
                  <Link route="panel.requests.show" routeParams={{ id: offer.job.id }}>
                    <h3>{offer.job.designReference}</h3>
                  </Link>
                  <JobMeta job={offer.job} />
                  <p className="fm-small fm-muted" style={{ marginTop: 4 }}>
                    Kazancınız{' '}
                    <strong style={{ color: 'var(--fm-honey-text)', fontWeight: 500 }}>
                      {money(offer.quotedPayout, offer.job.currencyCode)}
                    </strong>
                    {' · '}teklif {date(offer.expiresAt)} tarihinde kapanır
                  </p>
                </div>
                <div className="fm-actions">
                  <Form route="panel.offers.decline" routeParams={{ id: offer.id }}>
                    {({ processing }) => (
                      <button type="submit" className="fm-button fm-button--quiet" disabled={processing}>
                        <i className="ti ti-x" aria-hidden="true" /> reddet
                      </button>
                    )}
                  </Form>
                  <Form route="panel.offers.accept" routeParams={{ id: offer.id }}>
                    {({ processing }) => (
                      <button type="submit" className="fm-button fm-button--primary" disabled={processing}>
                        <i className="ti ti-check" aria-hidden="true" /> kabul et
                      </button>
                    )}
                  </Form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Devam eden işler ── */}
      <section className="fm-card">
        <h2>Devam eden işler</h2>
        {jobs.length === 0 ? (
          <EmptyState icon="ti-printer" text="Devam eden iş yok." />
        ) : (
          <ul className="fm-list">
            {jobs.map((job) => (
              <li key={job.id} className="fm-list__row">
                <div>
                  <Link route="panel.requests.show" routeParams={{ id: job.id }}>
                    <h3>{job.designReference}</h3>
                  </Link>
                  <JobMeta job={job} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--sp-1)', flexShrink: 0 }}>
                  <span className="fm-badge fm-badge--honey">{statusLabel(job.status)}</span>
                  {job.payout && (
                    <span className="fm-small" style={{ color: 'var(--fm-honey-text)', fontWeight: 500 }}>
                      {money(job.payout, job.currencyCode)}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Hızlı linkler ── */}
      <div style={{ display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
        <Link route="panel.orders.index" className="fm-button">
          <i className="ti ti-history" aria-hidden="true" /> geçmiş işler
        </Link>
        <Link route="panel.earnings.index" className="fm-button">
          <i className="ti ti-cash" aria-hidden="true" /> kazanç özeti
        </Link>
        <Link route="panel.profile.show" className="fm-button">
          <i className="ti ti-settings" aria-hidden="true" /> profil & kapasite
        </Link>
      </div>
    </div>
  )
}
