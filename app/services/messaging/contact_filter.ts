export interface FilterResult {
  text: string
  maskedCount: number
}

const MASK = '[hidden]'

// Order matters: longest / most specific first so a URL is not half-eaten by the e-mail rule.
const RULES: RegExp[] = [
  // e-mail addresses, also the "name [at] host" disguise
  /[\w.+-]+\s*(?:@|\[at\]|\(at\))\s*[\w-]+(?:\s*(?:\.|\[dot\]|\(dot\))\s*[\w-]+)+/gi,
  // links, including bare domains and shorteners used to move a deal off-platform
  /\b(?:https?:\/\/|www\.)\S+/gi,
  /\b[a-z0-9-]+\.(?:com|net|org|io|me|co|tr|com\.tr|app|link|ly|gl)\b(?:\/\S*)?/gi,
  // IBAN
  /\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){3,7}(?:\s?[A-Z0-9]{1,4})?\b/g,
  // social handles and chat apps by name
  /(?:^|\s)@[\w.]{3,}/g,
  /\b(?:whatsapp|whats app|telegram|instagram|insta|facebook|snapchat|signal|viber|wechat)\b(?:\s*[:\-]?\s*\S+)?/gi,
]

/** 8+ digits once separators are ignored: phone numbers, however they are spaced or dotted. */
function maskPhoneLike(text: string): FilterResult {
  let masked = 0
  const out = text.replaceAll(/(?:\+?\d[\s().-]*){8,}/g, (match) => {
    if (match.replaceAll(/\D/g, '').length < 8) return match
    masked++
    return ` ${MASK} `
  })
  return { text: out, maskedCount: masked }
}

/**
 * Keeps the two sides of an order on the platform (business rule 1 and PRD §9): contact details,
 * links and payment details are replaced before the other party ever sees the message.
 */
export function maskContactDetails(input: string): FilterResult {
  let text = input
  let maskedCount = 0
  for (const rule of RULES) {
    text = text.replaceAll(rule, () => {
      maskedCount++
      return ` ${MASK} `
    })
  }
  const phones = maskPhoneLike(text)
  text = phones.text
  maskedCount += phones.maskedCount
  return { text: text.replaceAll(/[ \t]{2,}/g, ' ').trim(), maskedCount }
}
