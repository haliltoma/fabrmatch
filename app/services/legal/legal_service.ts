import { readFile, access } from 'node:fs/promises'
import type { Locale } from '#services/i18n/locale'
import DomainError from '#exceptions/domain_error'
import env from '#start/env'
import PrivacyService from '#services/identity/privacy_service'
import app from '@adonisjs/core/services/app'

export const LEGAL_DOCS = [
  { slug: 'terms', title: 'Terms of use', version: '2026-09-draft' },
  { slug: 'privacy', title: 'Privacy notice', version: '2026-09-draft' },
  { slug: 'distance-sales', title: 'Distance sales terms', version: '2026-09-draft' },
  { slug: 'refunds', title: 'Cancellation and refunds', version: '2026-09-draft' },
] as const

/** Version stored with a checkout acceptance: changes whenever any document's version changes. */
export const ACCEPTANCE_VERSION = [...new Set(LEGAL_DOCS.map((d) => d.version))].join('+')

const escapeHtml = (t: string) =>
  t.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

/** Bold and site-internal links only (`[text](/path)`); external or scripted URLs never become anchors. */
const inline = (t: string) =>
  escapeHtml(t)
    .replaceAll(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replaceAll(/\[([^\]]+)\]\((\/[A-Za-z0-9/_\-?=&#.]*)\)/g, '<a href="$2">$1</a>')

/** Just enough Markdown for our own documents: headings, bullets, quotes, paragraphs. No raw HTML passes through. */
export function renderLegalMarkdown(source: string): string {
  const out: string[] = []
  let list: string[] = []
  const flush = () => {
    if (list.length > 0) out.push(`<ul>${list.map((l) => `<li>${inline(l)}</li>`).join('')}</ul>`)
    list = []
  }
  for (const raw of source.split('\n')) {
    const line = raw.trimEnd()
    if (line.startsWith('- ')) {
      list.push(line.slice(2))
      continue
    }
    flush()
    if (line.startsWith('## ')) out.push(`<h2>${inline(line.slice(3))}</h2>`)
    else if (line.startsWith('# ')) out.push(`<h1>${inline(line.slice(2))}</h1>`)
    else if (line.startsWith('> ')) out.push(`<blockquote>${inline(line.slice(2))}</blockquote>`)
    else if (line.trim() !== '') out.push(`<p>${inline(line)}</p>`)
  }
  flush()
  return out.join('\n')
}

export class LegalError extends DomainError {}

export default class LegalService {
  /**
   * Called before an order is created. When acceptance is switched on, the buyer must have ticked
   * the box; the accepted version is stored so it can be shown later.
   */
  async requireAcceptance(userId: string, accepted: boolean | undefined) {
    if (!env.get('LEGAL_ACCEPTANCE_REQUIRED', false)) return
    if (!accepted)
      throw new LegalError('Please accept the terms and the distance sales terms to continue')
    await new PrivacyService().recordConsent(userId, 'terms', ACCEPTANCE_VERSION, true)
  }

  find(slug: string) {
    return LEGAL_DOCS.find((d) => d.slug === slug) ?? null
  }

  async html(slug: string, locale: Locale = 'en'): Promise<string | null> {
    const doc = this.find(slug)
    if (!doc) return null
    const localised = app.makePath('resources/legal', locale, `${slug}.md`)
    const hasLocalised =
      locale !== 'en' &&
      (await access(localised).then(
        () => true,
        () => false
      ))
    const source = await readFile(
      hasLocalised ? localised : app.makePath('resources/legal', `${slug}.md`),
      'utf8'
    )
    return renderLegalMarkdown(source)
  }
}
