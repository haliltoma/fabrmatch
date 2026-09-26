// Usage: BASE_URL=http://localhost:3391 npm run a11y
// Scans public pages, then signed-in pages for each demo role (seed: database/seeders/demo_seeder.ts),
// with axe (WCAG 2.2 A/AA) at phone and desktop width. Exits 1 on any violation.
// Admin pages need 2FA off on the server under test: ADMIN_2FA_REQUIRED=false.
import { chromium } from 'playwright'
import AxeBuilder from '@axe-core/playwright'

const base = process.env.BASE_URL ?? 'http://localhost:3333'
const publicPaths = [
  '/',
  '/shop',
  '/for-makers',
  '/for-sellers',
  '/help',
  '/legal/terms',
  '/legal/privacy',
  '/tools/quick-quote',
  '/tools/maker-income',
  '/materials',
  '/blog',
  '/login',
  '/signup',
  '/forgot-password',
]
const roles = [
  {
    email: 'buyer@demo.test',
    password: 'password123',
    paths: ['/orders', '/files', '/cart', '/notifications', '/account/security', '/account/privacy'],
  },
  {
    email: 'seller@demo.test',
    password: 'password123',
    paths: ['/seller', '/seller/orders', '/seller/products', '/seller/analytics', '/seller/branding'],
  },
  {
    email: 'maker@demo.test',
    password: 'password123',
    paths: ['/maker', '/maker/work', '/maker/printers', '/maker/capacity', '/maker/earnings'],
  },
  {
    email: 'admin@fabrmatch.com',
    password: 'admin12345',
    paths: ['/admin', '/admin/queues', '/admin/orders', '/admin/users', '/admin/settings'],
  },
]

const browser = await chromium.launch()
let failed = 0

async function scan(page, label, path) {
  await page.goto(base + path, { waitUntil: 'networkidle' })
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  for (const v of violations) {
    failed++
    console.log(`[${label}] ${path} — ${v.id} (${v.impact}): ${v.help}`)
    for (const n of v.nodes.slice(0, 3)) console.log(`    ${n.target.join(' ')}`)
  }
}

for (const [label, width] of [
  ['phone', 375],
  ['desktop', 1440],
]) {
  const viewport = { width, height: 900 }
  const context = await browser.newContext({ viewport })
  const page = await context.newPage()
  for (const path of publicPaths) await scan(page, label, path)
  await context.close()

  for (const role of roles) {
    const signed = await browser.newContext({ viewport })
    const p = await signed.newPage()
    await p.goto(base + '/login', { waitUntil: 'networkidle' })
    await p.fill('input[type=email]', role.email)
    await p.fill('input[type=password]', role.password)
    await p.click('button[type=submit]')
    try {
      await p.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 15000 })
    } catch {
      failed++
      console.log(`[${label}] could not sign in as ${role.email} (seeded? login limiter?)`)
      await signed.close()
      continue
    }
    for (const path of role.paths) await scan(p, `${label} ${role.email}`, path)
    await signed.close()
  }
}
await browser.close()
console.log(failed === 0 ? 'No accessibility violations.' : `${failed} violation(s).`)
process.exit(failed === 0 ? 0 : 1)
