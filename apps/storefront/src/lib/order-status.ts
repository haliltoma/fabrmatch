/**
 * Sipariş durumu sözlüğü — bilinmeyen değer ham haliyle gösterilir (erken uyarı).
 */
const STATUS_TR: Record<string, string> = {
  pending: 'bekliyor',
  processing: 'hazırlanıyor',
  shipped: 'kargoya verildi',
  partially_shipped: 'kısmen kargoya verildi',
  delivered: 'teslim edildi',
  partially_delivered: 'kısmen teslim edildi',
  completed: 'tamamlandı',
  cancelled: 'iptal edildi',
  requires_action: 'işlem bekliyor',
  authorized: 'onaylandı',
  captured: 'tahsil edildi',
  partially_refunded: 'kısmen iade edildi',
  refunded: 'iade edildi',
  not_paid: 'ödeme bekliyor',
};

const POSITIVE_STATUSES = new Set([
  'processing',
  'shipped',
  'partially_shipped',
  'delivered',
  'partially_delivered',
  'completed',
  'captured',
  'authorized',
]);

/** Bilinmeyen durum ham değeriyle döner. */
export function statusLabel(status: string): string {
  return STATUS_TR[status] ?? status;
}

/** sage = ilerleyen/olumlu, muted = nötr/bekleyen. */
export function statusBadgeTone(status: string): 'sage' | 'muted' {
  return POSITIVE_STATUSES.has(status) ? 'sage' : 'muted';
}
