// Smoke test: home page + log in as a demo user, screenshot both, report page errors.
// node .claude/skills/run-fabrmatch/smoke.mjs <outDir> [email] [password] [path-after-login]
import { chromium } from 'playwright'

const [outDir = '.', email = 'seller@demo.test', password = 'password123', after] = process.argv.slice(2)
const base = process.env.APP_URL ?? 'http://localhost:3333'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 860 } })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))

await page.goto(`${base}/`)
await page.screenshot({ path: `${outDir}/home.png` })

await page.goto(`${base}/login`)
await page.fill('input[name=email]', email)
await page.fill('input[name=password]', password)
await Promise.all([
  page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 15000 }),
  page.press('input[name=password]', 'Enter'),
])
if (after) await page.goto(`${base}${after}`)
await page.waitForLoadState('networkidle')
console.log('after login:', page.url())
await page.screenshot({ path: `${outDir}/after-login.png` })

console.log('page errors:', errors.length ? errors : 'none')
await browser.close()
