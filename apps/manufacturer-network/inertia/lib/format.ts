const STATUS_LABELS: Record<string, string> = {
  matching_in_progress: 'eşleştiriliyor',
  awaiting_acceptance: 'onay bekliyor',
  accepted: 'kabul edildi',
  in_production: 'üretimde',
  quality_check: 'kalite kontrolünde',
  shipped: 'kargoda',
  delivered: 'teslim edildi',
  cancelled: 'iptal edildi',
}

export const statusLabel = (status: string) => STATUS_LABELS[status] ?? status

export function money(amount: number | null, currencyCode: string) {
  if (amount === null) {
    return 'hesaplanamadı'
  }
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: currencyCode.toUpperCase() }).format(amount)
}

export const date = (iso: string) =>
  new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso))

export function duration(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const rest = Math.round(minutes % 60)
  return hours ? `${hours} sa ${rest} dk` : `${rest} dk`
}
