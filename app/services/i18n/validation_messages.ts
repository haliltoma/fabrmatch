import type { Locale } from '#services/i18n/locale'

// keyed by the field's name in the English message: a label from validators/field_labels.ts, or
// the property name itself when it is a plain word
const FIELD_NAMES: Record<string, string> = {
  'email': 'e-posta',
  'password': 'parola',
  'password confirmation': 'parola onayı',
  // the other side of a `confirmed` rule arrives as its property name
  'passwordConfirmation': 'parola onayı',
  'current password': 'mevcut parola',
  'full name': 'ad soyad',
  'name': 'ad',
  'title': 'başlık',
  'description': 'açıklama',
  'message': 'mesaj',
  'phone': 'telefon',
  'city': 'şehir',
  'district': 'ilçe',
  'address': 'adres',
  'address line 2': 'adres 2. satır',
  'postal code': 'posta kodu',
  'country': 'ülke',
  'quantity': 'adet',
  'reason': 'neden',
  'code': 'kod',
  'iban': 'IBAN',
  'business name': 'işletme adı',
  'ID number': 'T.C. kimlik no',
  'tax number': 'vergi no',
  'company account': 'kurumsal hesap',
  'terms': 'koşullar',
  'coupon code': 'kupon kodu',
  'tracking number': 'takip numarası',
  'delivery country': 'teslimat ülkesi',
  'delivery address': 'teslimat adresi',
  'minimum order': 'en düşük sipariş',
  'maximum discount': 'en yüksek indirim',
  'usage limit': 'kullanım sınırı',
  'limit per customer': 'müşteri başına sınır',
  'minimum price': 'en düşük fiyat',
  'maximum price': 'en yüksek fiyat',
  'material cost per kg': 'kg başına malzeme maliyeti',
  'price per gram': 'gram fiyatı',
  'refund amount': 'iade tutarı',
  'price': 'fiyat',
  'value': 'değer',
  'commission': 'komisyon',
  'scale': 'ölçek',
  'delivery days': 'teslim günü',
  'lead time': 'hazırlık süresi',
  'end date': 'bitiş tarihi',
  'build width': 'baskı genişliği',
  'build depth': 'baskı derinliği',
  'build height': 'baskı yüksekliği',
  'materials': 'malzemeler',
  'material': 'malzeme',
  'color': 'renk',
  'printer model': 'yazıcı modeli',
  'product': 'ürün',
  'category': 'kategori',
  'model file': 'model dosyası',
  'file': 'dosya',
  'file name': 'dosya adı',
  'file size': 'dosya boyutu',
  'note': 'not',
  'comment': 'yorum',
  'rating': 'puan',
  'url': 'adres (URL)',
  'security code': 'güvenlik kodu',
  'expiry date': 'son kullanma tarihi',
  'card number': 'kart numarası',
}

const field = (name: string) => FIELD_NAMES[name] ?? name

const RULES: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
  // money fields (validators/money.ts)
  [/^Enter an amount like 12\.50$/, () => 'Tutarı 12,50 gibi yaz'],
  [/^The amount is too small$/, () => 'Tutar çok küçük'],
  [/^The amount is too large$/, () => 'Tutar çok büyük'],
  [/^The (.+) field is required$/, (m) => `${field(m[1])} alanı zorunludur`],
  // VineJS v4 says "must be defined" for a missing field
  [/^The (.+) field must be defined$/, (m) => `${field(m[1])} alanı zorunludur`],
  [/^The (.+) field must be accepted$/, (m) => `${field(m[1])} onaylanmalıdır`],
  [
    /^The (.+) field must be a valid URL$/,
    (m) => `${field(m[1])} alanı geçerli bir adres olmalıdır`,
  ],
  [/^The (.+) field must be a valid UUID$/, (m) => `Seçilen ${field(m[1])} geçersiz`],
  [
    /^The (.+) field must be a valid mobile phone number$/,
    (m) => `${field(m[1])} alanı geçerli bir cep telefonu olmalıdır`,
  ],
  [
    /^The (.+) field must be (\d+) characters long$/,
    (m) => `${field(m[1])} alanı ${m[2]} karakter olmalıdır`,
  ],
  [
    /^The (.+) field must be between (\S+) and (\S+)$/,
    (m) => `${field(m[1])} alanı ${m[2]} ile ${m[3]} arasında olmalıdır`,
  ],
  [/^The (.+) field must be positive$/, (m) => `${field(m[1])} alanı pozitif olmalıdır`],
  [
    /^The (.+) field must be a datetime value$/,
    (m) => `${field(m[1])} alanı geçerli bir tarih olmalıdır`,
  ],
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
