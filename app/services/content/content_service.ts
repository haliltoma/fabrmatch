import { readdir, readFile } from 'node:fs/promises'
import app from '@adonisjs/core/services/app'
import { renderLegalMarkdown } from '#services/legal/legal_service'

export type ContentKind = 'blog' | 'glossary' | 'materials' | 'use-cases'

export interface ContentMeta {
  slug: string
  title: string
  description: string
  date: string
  kind: ContentKind
}

export interface ContentEntry extends ContentMeta {
  html: string
}

const SLUG = /^[a-z0-9-]+$/

/** `key: value` lines between two `---` fences; anything else in the header is ignored. */
export function parseFrontMatter(source: string): { meta: Record<string, string>; body: string } {
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(source)
  if (!match) return { meta: {}, body: source }
  const meta: Record<string, string> = {}
  for (const line of match[1].split('\n')) {
    const at = line.indexOf(':')
    if (at > 0) meta[line.slice(0, at).trim()] = line.slice(at + 1).trim()
  }
  return { meta, body: match[2] }
}

/** Markdown files in `resources/content/<kind>/`: blog posts (newest first) and glossary terms (A–Z). */
export default class ContentService {
  private dir(kind: ContentKind) {
    return app.makePath('resources/content', kind)
  }

  async list(kind: ContentKind): Promise<ContentMeta[]> {
    const names = await readdir(this.dir(kind))
    const files = names.filter((f) => f.endsWith('.md'))
    const entries: ContentMeta[] = []
    for (const file of files) {
      const slug = file.slice(0, -3)
      if (!SLUG.test(slug)) continue
      const source = await readFile(`${this.dir(kind)}/${file}`, 'utf8')
      const { meta } = parseFrontMatter(source)
      if (!meta.title || !meta.description || !meta.date) continue
      entries.push({
        slug,
        title: meta.title,
        description: meta.description,
        date: meta.date,
        kind,
      })
    }
    return kind === 'blog'
      ? entries.sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug))
      : entries.sort((a, b) => a.title.localeCompare(b.title, 'tr'))
  }

  async find(kind: ContentKind, slug: string): Promise<ContentEntry | null> {
    if (!SLUG.test(slug)) return null
    let source: string
    try {
      source = await readFile(`${this.dir(kind)}/${slug}.md`, 'utf8')
    } catch {
      return null
    }
    const { meta, body } = parseFrontMatter(source)
    if (!meta.title || !meta.description || !meta.date) return null
    return {
      slug,
      title: meta.title,
      description: meta.description,
      date: meta.date,
      kind,
      html: renderLegalMarkdown(body),
    }
  }
}
