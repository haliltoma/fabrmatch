/** T.C. kimlik numarası: 11 digits, no leading zero, the two official check digits. */
export function isValidTckn(value: string): boolean {
  if (!/^[1-9]\d{10}$/.test(value)) return false
  const d = [...value].map(Number)
  const odd = d[0] + d[2] + d[4] + d[6] + d[8]
  const even = d[1] + d[3] + d[5] + d[7]
  const tenth = (((odd * 7 - even) % 10) + 10) % 10
  const eleventh = d.slice(0, 10).reduce((a, b) => a + b, 0) % 10
  return d[9] === tenth && d[10] === eleventh
}

/** Vergi kimlik numarası (companies): 10 digits with the GİB check digit. */
export function isValidVkn(value: string): boolean {
  if (!/^\d{10}$/.test(value)) return false
  const d = [...value].map(Number)
  let sum = 0
  for (let i = 0; i < 9; i++) {
    const shifted = (d[i] + 9 - i) % 10
    let weighted = (shifted * 2 ** (9 - i)) % 9
    if (shifted !== 0 && weighted === 0) weighted = 9
    sum += weighted
  }
  return (10 - (sum % 10)) % 10 === d[9]
}
