// Usage: BASE_URL=http://localhost:3333 npm run vitals
// Largest Contentful Paint and Cumulative Layout Shift for public pages, read from the browser's
// own PerformanceObserver (no Lighthouse needed). Phone viewport, 4× CPU slowdown. Exits 1 when a
// page misses "good" (LCP ≤ 2500 ms, CLS ≤ 0.1). Dev-server numbers are pessimistic for LCP.
import { chromium } from 'playwright'

const base = process.env.BASE_URL ?? 'http://localhost:3333'
const paths = ['/', '/shop', '/for-makers', '/for-sellers', '/tools/quick-quote', '/materials', '/blog']
const LCP_GOOD = 2500
const CLS_GOOD = 0.1

const browser = await chromium.launch()
let failed = 0
for (const path of paths) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  const cdp = await context.newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  await page.addInitScript(() => {
    window.__vitals = { lcp: 0, cls: 0 }
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) window.__vitals.lcp = e.startTime
    }).observe({ type: 'largest-contentful-paint', buffered: true })
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) if (!e.hadRecentInput) window.__vitals.cls += e.value
    }).observe({ type: 'layout-shift', buffered: true })
  })
  await page.goto(base + path, { waitUntil: 'networkidle' })
  // scroll through once so shifts caused by lazy content are counted too
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 80))
    }
  })
  await page.waitForTimeout(500)
  const { lcp, cls } = await page.evaluate(() => window.__vitals)
  const ok = lcp <= LCP_GOOD && cls <= CLS_GOOD
  if (!ok) failed++
  console.log(`${ok ? 'ok  ' : 'SLOW'} ${path.padEnd(20)} LCP ${Math.round(lcp)} ms  CLS ${cls.toFixed(3)}`)
  await context.close()
}
await browser.close()
process.exit(failed === 0 ? 0 : 1)
