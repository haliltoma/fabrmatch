import type { Locale } from '#services/i18n/locale'

const FIELD_NAMES: Record<string, string> = {
  email: 'e-posta',
  password: 'parola',
  passwordConfirmation: 'parola onayı',
  fullName: 'ad soyad',
  name: 'ad',
  title: 'başlık',
  description: 'açıklama',
  message: 'mesaj',
  phone: 'telefon',
  city: 'şehir',
  line1: 'adres',
  postalCode: 'posta kodu',
  country: 'ülke',
  quantity: 'adet',
  reason: 'neden',
  code: 'kod',
  iban: 'IBAN',
}

const field = (name: string) => FIELD_NAMES[name] ?? name

const RULES: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
  // money fields (validators/money.ts)
  [/^Enter an amount like 12\.50$/, () => 'Tutarı 12,50 gibi yaz'],
  [/^The amount is too small$/, () => 'Tutar çok küçük'],
  [/^The amount is too large$/, () => 'Tutar çok büyük'],
  [/^The (.+) field is required$/, (m) => `${field(m[1])} alanı zorunludur`],
  [/^The (.+) field must be a string$/, (m) => `${field(m[1])} alanı metin olmalıdır`],
  [
    /^The (.+) field must be a valid email address$/,
    (m) => `${field(m[1])} alanı geçerli bir e-posta adresi olmalıdır`,
  ],
  [
    /^The (.+) field must have at least (\d+) characters$/,
    (m) => `${field(m[1])} alanı en az ${m[2]} karakter olmalıdır`,
  ],
  [
    /^The (.+) field must not be greater than (\d+) characters$/,
    (m) => `${field(m[1])} alanı en fazla ${m[2]} karakter olabilir`,
  ],
  [
    /^The (.+) field and (.+) field must be the same$/,
    (m) => `${field(m[1])} ve ${field(m[2])} alanları aynı olmalıdır`,
  ],
  [/^The (.+) field must be a number$/, (m) => `${field(m[1])} alanı sayı olmalıdır`],
  [
    /^The (.+) field must be at least (\S+)$/,
    (m) => `${field(m[1])} alanı en az ${m[2]} olmalıdır`,
  ],
  [
    /^The (.+) field must not be greater than (\S+)$/,
    (m) => `${field(m[1])} alanı en fazla ${m[2]} olabilir`,
  ],
  [/^The (.+) has already been taken$/, (m) => `Bu ${field(m[1])} zaten kullanılıyor`],
  [/^The (.+) field format is invalid$/, (m) => `${field(m[1])} alanının biçimi geçersiz`],
  [/^The selected (.+) is invalid$/, (m) => `Seçilen ${field(m[1])} geçersiz`],
  [/^Invalid user credentials$/, () => 'E-posta veya parola hatalı'],
  [/^Too many requests$/, () => 'Çok fazla istek. Biraz sonra tekrar dene.'],
]

/** Translates VineJS/auth error text; unknown messages stay as they are. */
export function translateValidationMessage(locale: Locale, message: string): string {
  if (locale !== 'tr') return message
  for (const [pattern, render] of RULES) {
    const match = message.match(pattern)
    if (match) return render(match)
  }
  return message
}

export function translateValidationErrors<T>(locale: Locale, errors: T): T {
  if (locale !== 'tr' || !errors || typeof errors !== 'object') return errors
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(errors as Record<string, unknown>)) {
    out[key] =
      typeof value === 'string'
        ? translateValidationMessage(locale, value)
        : Array.isArray(value)
          ? value.map((v) => (typeof v === 'string' ? translateValidationMessage(locale, v) : v))
          : value
  }
  return out as T
}
