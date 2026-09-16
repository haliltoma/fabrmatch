import { Form, Link } from '@adonisjs/inertia/react'
import { date, duration, money, statusLabel } from '~/lib/format'
import type { JobDetail } from '~/lib/panel_types'
import type { InertiaProps } from '~/types'

type Props = InertiaProps<{ job: JobDetail; openOfferId: number | null }>

const STEPS = [
  { status: 'accepted', label: 'teklif kabul edildi', icon: 'ti-check' },
  { status: 'in_production', label: 'üretime başlandı', icon: 'ti-printer' },
  { status: 'quality_check', label: 'kalite kontrol fotoğrafları yüklendi', icon: 'ti-clipboard-check' },
  { status: 'shipped', label: 'kargoya verildi', icon: 'ti-truck' },
  { status: 'delivered', label: 'teslim edildi', icon: 'ti-package' },
] as const

/** 06 §3: malzeme verimliliği çubuğu — gizlenmez, yanında dört veri birlikte gösterilir */
function MaterialEfficiency({ job }: { job: JobDetail }) {
  const estimate = job.printEstimate
  if (!estimate) {
    return <p className="fm-small">Bu iş için baskı tahmini gönderilmedi.</p>
  }
  const total = estimate.part_weight_g + estimate.support_weight_g
  const usedPercent = total === 0 ? 100 : (estimate.part_weight_g / total) * 100

  return (
    <div className="fm-form">
      <div className="fm-material-bar" role="img" aria-label={`Malzemenin yüzde ${Math.round(usedPercent)} kadarı ürüne gidiyor`}>
        <div className="fm-material-bar__used" style={{ width: `${usedPercent}%` }} />
        <div className="fm-material-bar__waste" style={{ width: `${100 - usedPercent}%` }} />
      </div>
      <div className="fm-material-legend">
        <div>
          <strong>{estimate.slicer}</strong>slicer
        </div>
        <div>
          <strong>{estimate.part_weight_g} g</strong>ürün ağırlığı
        </div>
        <div>
          <strong>{estimate.support_weight_g} g</strong>destek ve atık
        </div>
        <div>
          <strong>{duration(estimate.print_time_minutes)}</strong>tahmini baskı süresi
        </div>
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

  if (job.status === 'accepted' || job.status === 'shipped') {
    const next = job.status === 'accepted' ? 'in_production' : 'delivered'
    return (
      <Form route="panel.requests.steps.store" routeParams={{ id: job.id }}>
        {({ processing }) => (
          <>
            <input type="hidden" name="status" value={next} />
            <button type="submit" className="fm-button fm-button--primary" disabled={processing}>
              {next === 'in_production' ? 'üretime başladım' : 'teslim edildi olarak işaretle'}
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
              <label htmlFor="photos">Kalite kontrol fotoğrafları</label>
              <textarea
                id="photos"
                name="photos"
                placeholder="https://..."
                data-invalid={errors.photos ? 'true' : undefined}
              />
              <p className="fm-field__hint">Her satıra bir https bağlantısı. Anlaşmazlıkta kanıt olarak kullanılır.</p>
              {errors.photos && <p className="fm-field__error">{errors.photos}</p>}
            </div>
            <div>
              <button type="submit" className="fm-button fm-button--primary" disabled={processing}>
                kalite kontrolünü gönder
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
                data-invalid={errors.trackingNumber ? 'true' : undefined}
              />
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

  return null
}

export default function RequestDetail({ job, openOfferId }: Props) {
  const reached = STEPS.findIndex((step) => step.status === job.status)

  return (
    <div className="fm-page">
      <div className="fm-page__head">
        <div>
          <Link route="panel.index" className="fm-small">
            <i className="ti ti-arrow-left" aria-hidden="true" /> panele dön
          </Link>
          <h1>{job.designReference}</h1>
          <p className="fm-small">
            {job.quantity} adet · {job.material}
            {job.color ? ` · ${job.color}` : ''} · {job.buyerCity ?? job.buyerCountry} ·{' '}
            {date(job.requestedDeliveryBy)} tarihine kadar
          </p>
        </div>
        <span className="fm-badge fm-badge--honey">{statusLabel(job.status)}</span>
      </div>

      <section className="fm-card">
        <h2>Malzeme verimliliği</h2>
        <MaterialEfficiency job={job} />
      </section>

      <section className="fm-card">
        <h2>Kazanç</h2>
        <p className="fm-stat__value">{money(job.payout, job.currencyCode)}</p>
        <p className="fm-small">Ödeme, teslimat onaylandıktan sonra platform tarafından yapılır.</p>
      </section>

      <section className="fm-card">
        <h2>Üretim adımları</h2>
        <ol className="fm-steps">
          {STEPS.map((step, index) => (
            <li
              key={step.status}
              className={`fm-step ${index < reached ? 'fm-step--done' : ''} ${index === reached ? 'fm-step--current' : ''}`}
            >
              <i className={`ti ${index <= reached ? 'ti-circle-check' : step.icon}`} aria-hidden="true" />
              {step.label}
            </li>
          ))}
        </ol>
        {job.trackingNumber && <p className="fm-small">Takip numarası: {job.trackingNumber}</p>}
        <NextStep job={job} openOfferId={openOfferId} />
      </section>
    </div>
  )
}
