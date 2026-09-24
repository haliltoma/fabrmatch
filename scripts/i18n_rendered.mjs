// Renders pages in Turkish and lists visible text that still looks English.
// Usage: BASE_URL=http://localhost:3333 [LOGIN=email:password] node scripts/i18n_rendered.mjs [/path ...]
import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'

const base = process.env.BASE_URL ?? 'http://localhost:3333'
const paths = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['/', '/shop', '/for-makers', '/for-sellers', '/help', '/legal/terms', '/tools/quick-quote',
     '/tools/maker-income', '/login', '/signup', '/forgot-password', '/materials', '/blog', '/glossary',
     '/status', '/changelog', '/does-not-exist']
// English source strings that have a Turkish entry: seeing one verbatim means it was not translated.
const dict = readFileSync(new URL('../inertia/lib/i18n/tr.ts', import.meta.url), 'utf8')
const englishKeys = new Set()
for (const m of dict.matchAll(/^ {2}'((?:[^'\\]|\\.)*)':\s*(?:'((?:[^'\\]|\\.)*)')?/gm)) {
  const key = m[1].replace(/\\'/g, "'")
  const value = m[2]?.replace(/\\'/g, "'")
  if (value !== undefined && value !== key && !/^[0-9{]/.test(key) && key.length > 3) englishKeys.add(key)
}
const STOP = /\b(the|your|you|and|is|of|for|with|are|will|can|this|that|from|when|how|what|not|our)\b/i

const login = process.env.LOGIN // "email:password" to check signed-in pages
const browser = await chromium.launch()
const context = await browser.newContext({ locale: 'tr-TR' })
const page = await context.newPage()
if (login) {
  const [email, password] = login.split(':')
  await page.goto(base + '/login', { waitUntil: 'networkidle' })
  await page.fill('input[type=email], input[name=email]', email)
  await page.fill('input[type=password], input[name=password]', password)
  await page.click('button[type=submit]')
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 15000 })
}
let total = 0
for (const path of paths) {
  await page.goto(base + path, { waitUntil: 'networkidle' })
  const texts = await page.evaluate(() => {
    const out = new Set()
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    while (walker.nextNode()) {
      const n = walker.currentNode
      const tag = n.parentElement?.tagName
      if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(tag)) continue
      if (n.parentElement?.closest('[data-i18n-skip]')) continue
      const t = n.textContent.replace(/\s+/g, ' ').trim()
      if (t) out.add(t)
    }
    for (const el of document.querySelectorAll('[placeholder],[aria-label],[title],img[alt]')) {
      for (const a of ['placeholder', 'aria-label', 'title', 'alt']) {
        const v = el.getAttribute(a)
        if (v) out.add(v.trim())
      }
    }
    return [...out]
  })
  const english = texts.filter((t) => t.length > 3 && (STOP.test(t) || englishKeys.has(t)))
  total += english.length
  console.log(`\n== ${path}  (${english.length} English-looking of ${texts.length})`)
  for (const t of english) console.log('  ' + t.slice(0, 110))
}
await browser.close()
console.log(`\nTotal English-looking strings: ${total}`)
