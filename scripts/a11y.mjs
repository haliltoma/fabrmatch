// Usage: BASE_URL=http://localhost:3391 npm run a11y
// Scans public pages with axe (WCAG 2.2 A/AA rules) at phone and desktop width; exits 1 on violations.
import { chromium } from 'playwright'
import AxeBuilder from '@axe-core/playwright'

const base = process.env.BASE_URL ?? 'http://localhost:3333'
const paths = [
  '/',
  '/shop',
  '/for-makers',
  '/for-sellers',
  '/help',
  '/legal/terms',
  '/legal/privacy',
  '/tools/quick-quote',
  '/tools/maker-income',
  '/login',
  '/signup',
  '/forgot-password',
]
const browser = await chromium.launch()
let failed = 0
for (const [label, width] of [
  ['phone', 375],
  ['desktop', 1440],
]) {
  const context = await browser.newContext({ viewport: { width, height: 900 } })
  const page = await context.newPage()
  for (const path of paths) {
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
  await context.close()
}
await browser.close()
console.log(failed === 0 ? 'No accessibility violations.' : `${failed} violation(s).`)
process.exit(failed === 0 ? 0 : 1)
