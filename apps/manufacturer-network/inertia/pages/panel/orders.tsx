import { Link } from '@adonisjs/inertia/react'
import { date, money, statusLabel } from '~/lib/format'
import type { JobSummary } from '~/lib/panel_types'
import type { InertiaProps } from '~/types'

type Props = InertiaProps<{
  orders: JobSummary[]
  totalDelivered: number
  totalCancelled: number
}>

export default function Orders({ orders, totalDelivered, totalCancelled }: Props) {
  return (
    <div className="fm-page">
      <div className="fm-page__head">
        <div>
          <h1>Geçmiş işler</h1>
          <p className="fm-small fm-muted" style={{ marginTop: 4 }}>
            Tamamlanan ve iptal edilen tüm siparişler
          </p>
        </div>
      </div>

      {/* ── Özet ── */}
      <div className="fm-summary-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="fm-summary-card">
          <div className="fm-summary-card__label">Toplam sipariş</div>
          <div className="fm-summary-card__value">{orders.length}</div>
        </div>
        <div className="fm-summary-card">
          <div className="fm-summary-card__label">Teslim edilen</div>
          <div className="fm-summary-card__value" style={{ color: 'var(--fm-sage-text)' }}>{totalDelivered}</div>
        </div>
        <div className="fm-summary-card">
          <div className="fm-summary-card__label">İptal edilen</div>
          <div className="fm-summary-card__value" style={{ color: 'var(--fm-danger-text)' }}>{totalCancelled}</div>
        </div>
      </div>

      {/* ── Tablo ── */}
      <section className="fm-card" style={{ padding: 0, overflow: 'hidden' }}>
        {orders.length === 0 ? (
          <div className="fm-empty" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sp-2)', padding: 'var(--sp-7)' }}>
            <i className="ti ti-history" style={{ fontSize: 36, color: 'var(--border)' }} aria-hidden="true" />
            <span>Henüz tamamlanmış sipariş yok.</span>
          </div>
        ) : (
          <div className="fm-table-wrap">
            <table className="fm-table">
              <thead>
                <tr>
                  <th>Tasarım referansı</th>
                  <th>Malzeme</th>
                  <th>Adet</th>
                  <th>Teslim tarihi</th>
                  <th>Kazanç</th>
                  <th>Durum</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <Link
                        route="panel.requests.show"
                        routeParams={{ id: order.id }}
                        style={{ color: 'var(--fm-honey-text)', fontWeight: 500 }}
                      >
                        {order.designReference}
                      </Link>
                      <div className="fm-small fm-muted">{order.publicId}</div>
                    </td>
                    <td>
                      {order.material}
                      {order.color ? ` · ${order.color}` : ''}
                    </td>
                    <td>{order.quantity}</td>
                    <td>{date(order.requestedDeliveryBy)}</td>
                    <td style={{ fontWeight: 500 }}>
                      {money(order.payout, order.currencyCode)}
                    </td>
                    <td>
                      <span
                        className="fm-badge"
                        style={
                          order.status === 'delivered'
                            ? { background: 'var(--fm-sage-bg)', color: 'var(--fm-sage-text)', border: 'none' }
                            : { background: 'var(--fm-danger-bg)', color: 'var(--fm-danger-text)', border: 'none' }
                        }
                      >
                        {statusLabel(order.status)}
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
