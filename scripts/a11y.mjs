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
  '/cities',
  // resolved at run time: the first city with enough makers (empty until makers seed there)
  'first-city',
  '/use-cases',
  '/use-cases/prototype',
  // resolved at run time: the first product in the shop (gallery, finishing and colour pickers)
  'first-product',
  '/blog',
  '/login',
  '/signup',
  '/forgot-password',
]
const roles = [
  {
    email: 'buyer@demo.test',
    password: 'password123',
    paths: [
      '/orders',
      '/invoices',
      '/files',
      '/cart',
      '/notifications',
      '/account/security',
      '/account/privacy',
    ],
  },
  {
    email: 'seller@demo.test',
    password: 'password123',
    paths: [
      '/seller',
      '/seller/orders',
      '/seller/products',
      '/seller/analytics',
      '/seller/branding',
      '/seller/developers',
    ],
  },
  {
    email: 'maker@demo.test',
    password: 'password123',
    paths: [
      '/maker',
      '/maker/work',
      '/maker/printers',
      '/maker/capacity',
      '/maker/earnings',
      '/maker/finishing',
      '/maker/payout',
    ],
  },
  {
    email: 'admin@fabrmatch.com',
    password: 'admin12345',
    paths: [
      '/admin',
      '/admin/queues',
      '/admin/matching',
      '/admin/orders',
      '/admin/users',
      '/admin/finishing',
      '/admin/reports',
      '/admin/settings',
    ],
  },
]

const browser = await chromium.launch()
let failed = 0
let skipped = 0

async function scan(page, label, path) {
  if (path === 'first-product') {
    await page.goto(base + '/shop', { waitUntil: 'networkidle' })
    const href = await page.locator('a[href^="/shop/"]').first().getAttribute('href')
    if (!href) return
    path = href
  }
  if (path === 'first-city') {
    await page.goto(base + '/cities', { waitUntil: 'networkidle' })
    const href = await page.locator('a[href^="/cities/"]').first().getAttribute('href')
    if (!href) return
    path = href
  }
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
      await p.waitForURL(
        (u) => !u.pathname.startsWith('/login') || u.pathname === '/login/two-factor',
        {
          timeout: 15000,
        }
      )
      if (new URL(p.url()).pathname === '/login/two-factor') {
        // not an accessibility finding: this account asks for a code (the browser suite covers these pages)
        skipped++
        console.log(`[${label}] skipped ${role.email}: the account has two-factor sign-in on`)
        await signed.close()
        continue
      }
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
console.log(
  (failed === 0 ? 'No accessibility violations.' : `${failed} violation(s).`) +
    (skipped > 0 ? ` ${skipped} role scan(s) skipped (two-factor).` : '')
)
process.exit(failed === 0 ? 0 : 1)
