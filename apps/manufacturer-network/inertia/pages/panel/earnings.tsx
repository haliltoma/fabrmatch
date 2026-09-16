import { Link } from '@adonisjs/inertia/react'
import { money, date } from '~/lib/format'
import type { InertiaProps } from '~/types'

type PayoutItem = {
  id: number
  publicId: string
  amount: number
  currencyCode: string
  status: 'pending' | 'sent'
  createdAt: string
  designReference: string
  productionRequestPublicId: string
}

type Summary = {
  totalPending: number
  totalSent: number
  thisMonth: number
  currencyCode: string
}

type Props = InertiaProps<{
  instructions: PayoutItem[]
  summary: Summary
}>

export default function Earnings({ instructions, summary }: Props) {
  return (
    <div className="fm-page">
      <div className="fm-page__head">
        <div>
          <h1>Kazançlar</h1>
          <p className="fm-small fm-muted" style={{ marginTop: 4 }}>
            Tüm ödeme talimatları ve bekleyen bakiyeniz
          </p>
        </div>
      </div>

      {/* ── Finansal özet ── */}
      <div className="fm-summary-grid">
        <div className="fm-summary-card">
          <div className="fm-summary-card__label">Bu ay</div>
          <div className="fm-summary-card__value" style={{ color: 'var(--fm-honey-text)' }}>
            {money(summary.thisMonth, summary.currencyCode)}
          </div>
        </div>
        <div className="fm-summary-card">
          <div className="fm-summary-card__label">Ödeme bekleyen</div>
          <div className="fm-summary-card__value">
            {money(summary.totalPending, summary.currencyCode)}
          </div>
          <div className="fm-summary-card__sub">teslimat onayı bekleniyor</div>
        </div>
        <div className="fm-summary-card">
          <div className="fm-summary-card__label">Ödenen toplam</div>
          <div className="fm-summary-card__value" style={{ color: 'var(--fm-sage-text)' }}>
            {money(summary.totalSent, summary.currencyCode)}
          </div>
        </div>
        <div className="fm-summary-card">
          <div className="fm-summary-card__label">Genel toplam</div>
          <div className="fm-summary-card__value">
            {money(summary.totalPending + summary.totalSent, summary.currencyCode)}
          </div>
        </div>
      </div>

      {/* ── Ödeme açıklaması ── */}
      <div className="fm-card fm-card--honey">
        <div style={{ display: 'flex', gap: 'var(--sp-2)', alignItems: 'flex-start' }}>
          <i className="ti ti-info-circle" aria-hidden="true" style={{ fontSize: 18, marginTop: 2, flexShrink: 0 }} />
          <p className="fm-small">
            Ödemeler teslimat onayından sonra platform tarafından Stripe hesabınıza gönderilir. Stripe hesabı bağlı değilse{' '}
            <Link route="panel.profile.show" style={{ color: 'var(--fm-honey-text)', textDecoration: 'underline' }}>
              profil sayfanızdan
            </Link>{' '}
            iletişime geçin.
          </p>
        </div>
      </div>

      {/* ── Ödeme talimatları tablosu ── */}
      <section className="fm-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: 'var(--sp-4) var(--sp-4) var(--sp-2)' }}>
          <h2>Ödeme geçmişi</h2>
        </div>
        {instructions.length === 0 ? (
          <div className="fm-empty" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sp-2)', padding: 'var(--sp-7)' }}>
            <i className="ti ti-cash" style={{ fontSize: 36, color: 'var(--border)' }} aria-hidden="true" />
            <span>Henüz ödeme talimatı yok.</span>
          </div>
        ) : (
          <div className="fm-table-wrap">
            <table className="fm-table">
              <thead>
                <tr>
                  <th>Sipariş</th>
                  <th>Tarih</th>
                  <th>Tutar</th>
                  <th>Durum</th>
                </tr>
              </thead>
              <tbody>
                {instructions.map((inst) => (
                  <tr key={inst.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{inst.designReference}</div>
                      <div className="fm-small fm-muted">{inst.productionRequestPublicId}</div>
                    </td>
                    <td className="fm-small">{date(inst.createdAt)}</td>
                    <td style={{ fontWeight: 500 }}>{money(inst.amount, inst.currencyCode)}</td>
                    <td>
                      <span
                        className="fm-badge"
                        style={
                          inst.status === 'sent'
                            ? { background: 'var(--fm-sage-bg)', color: 'var(--fm-sage-text)', border: 'none' }
                            : { background: 'var(--fm-honey-bg)', color: 'var(--fm-honey-text)', border: 'none' }
                        }
                      >
                        <i
                          className={`ti ${inst.status === 'sent' ? 'ti-circle-check' : 'ti-clock-hour-4'}`}
                          aria-hidden="true"
                        />
                        {inst.status === 'sent' ? 'ödendi' : 'bekliyor'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
