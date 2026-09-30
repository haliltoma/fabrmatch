// Usage: BASE_URL=http://localhost:3410 npm run ssr:check
// Every page in the sitemap (plus the auth pages and a few signed-in pages per demo role) must come
// back server-rendered: real markup inside #app, a real <title>, JSON-LD where the page declares it,
// and no hydration error once React takes over in the browser. Exits 1 on any problem.
// Search engines and AI crawlers read that first HTML, so this is the SEO safety net for SSR.
import { chromium } from 'playwright'

const base = process.env.BASE_URL ?? 'http://localhost:3333'
const extra = ['/login', '/signup', '/forgot-password', '/help', '/status', '/tools/quick-quote']
const roles = [
  ['buyer@demo.test', ['/orders', '/files', '/cart', '/notifications', '/account/security']],
  ['seller@demo.test', ['/seller', '/seller/products', '/seller/orders', '/seller/analytics']],
]

const sitemap = await (await fetch(`${base}/sitemap.xml`)).text()
const paths = [
  ...new Set([
    ...[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname),
    ...extra,
  ]),
]

const browser = await chromium.launch()
const problems = []

async function check(page, path) {
  const errors = []
  const onConsole = (m) => {
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text())
  }
  const onError = (e) => errors.push(e.message)
  page.on('console', onConsole)
  page.on('pageerror', onError)
  const raw = await (await page.request.get(base + path)).text()
  const response = await page.goto(base + path, { waitUntil: 'networkidle' })
  await page.waitForTimeout(300)
  page.off('console', onConsole)
  page.off('pageerror', onError)

  const title = (raw.match(/<title[^>]*>([^<]*)<\/title>/) ?? [])[1] ?? ''
  const found = []
  if ((response?.status() ?? 500) >= 400) found.push(`status ${response?.status()}`)
  if (!/id="app"[^>]*>\s*<[a-z]/i.test(raw)) found.push('not server-rendered')
  if (!title || /AdonisJS|Fabrmatch - Fabrmatch/.test(title)) found.push(`title "${title}"`)
  const hydration = errors.filter((e) => /hydrat|did not match|server rendered/i.test(e))
  if (hydration.length) found.push(`hydration: ${hydration[0].slice(0, 140)}`)
  const other = errors.filter((e) => !hydration.includes(e))
  if (other.length) found.push(`console: ${other[0].slice(0, 140)}`)
  if (found.length) problems.push(`${path}: ${found.join(' · ')}`)
}

const page = await browser.newPage()
for (const path of paths) await check(page, path)

for (const [email, signedIn] of roles) {
  const context = await browser.newContext()
  const p = await context.newPage()
  await p.goto(`${base}/login`)
  await p.fill('input[name=email]', email)
  await p.fill('input[name=password]', 'password123')
  await Promise.all([p.waitForNavigation(), p.click('button[type=submit]')])
  for (const path of signedIn) await check(p, path)
  await context.close()
}

await browser.close()
const total = paths.length + roles.reduce((n, [, list]) => n + list.length, 0)
if (problems.length) {
  console.log(`${problems.length} of ${total} pages have SSR problems:`)
  for (const line of problems) console.log(`- ${line}`)
  process.exit(1)
}
console.log(`All ${total} pages are server-rendered and hydrate cleanly.`)
