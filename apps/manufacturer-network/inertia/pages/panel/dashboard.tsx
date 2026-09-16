import { Form, Link } from '@adonisjs/inertia/react'
import { date, money, statusLabel } from '~/lib/format'
import type { JobSummary, ManufacturerSummary, OfferSummary } from '~/lib/panel_types'
import type { InertiaProps } from '~/types'

type Props = InertiaProps<{
  manufacturer: ManufacturerSummary
  offers: OfferSummary[]
  jobs: JobSummary[]
}>

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
      <span>
        <i className="ti ti-calendar" aria-hidden="true" /> {date(job.requestedDeliveryBy)} tarihine kadar
      </span>
    </div>
  )
}

export default function Dashboard({ manufacturer, offers, jobs }: Props) {
  return (
    <div className="fm-page">
      <div className="fm-page__head">
        <div>
          <h1>Üretim paneli</h1>
          <p className="fm-small">
            {manufacturer.displayName} · <span className="fm-badge fm-badge--honey">{manufacturer.publicCode}</span>
          </p>
        </div>
      </div>

      {manufacturer.status !== 'active' && (
        <div className="fm-card fm-card--honey">
          <h3>Başvurunuz inceleniyor</h3>
          <p className="fm-small">Profiliniz onaylandığında size uygun işler burada teklif olarak görünecek.</p>
        </div>
      )}

      <div className="fm-stats">
        <div className="fm-stat">
          <div className="fm-small">Açık teklifler</div>
          <div className="fm-stat__value">{offers.length}</div>
        </div>
        <div className="fm-stat">
          <div className="fm-small">Devam eden işler</div>
          <div className="fm-stat__value">{jobs.length}</div>
        </div>
        <div className="fm-stat">
          <div className="fm-small">Tamamlanan siparişler</div>
          <div className="fm-stat__value">{manufacturer.completedOrders}</div>
        </div>
      </div>

      <section className="fm-card">
        <h2>Size gelen teklifler</h2>
        {offers.length === 0 ? (
          <p className="fm-empty">Şu an açık teklif yok.</p>
        ) : (
          <ul className="fm-list">
            {offers.map((offer) => (
              <li key={offer.id} className="fm-list__row">
                <div>
                  <Link route="panel.requests.show" routeParams={{ id: offer.job.id }}>
                    <h3>{offer.job.designReference}</h3>
                  </Link>
                  <JobMeta job={offer.job} />
                  <p className="fm-small">
                    Kazancınız {money(offer.quotedPayout, offer.job.currencyCode)} · teklif{' '}
                    {date(offer.expiresAt)} tarihinde kapanır
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
                      <button type="submit" className="fm-button" disabled={processing}>
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

      <section className="fm-card">
        <h2>Devam eden işler</h2>
        {jobs.length === 0 ? (
          <p className="fm-empty">Devam eden iş yok.</p>
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
                <span className="fm-badge fm-badge--honey">{statusLabel(job.status)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
