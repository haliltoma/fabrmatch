export function money(amount: number, currencyCode: string) {
  // building-storefronts kuralı: Medusa fiyatları olduğu gibi saklar, 100'e bölünmez.
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: currencyCode.toUpperCase() }).format(amount);
}

export const date = (iso: string) =>
  new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));

export function duration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  return hours ? `${hours} sa ${rest} dk` : `${rest} dk`;
}
