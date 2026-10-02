import { chromium } from 'playwright'
const out = process.argv[2]
const b = await chromium.launch()
for (const [lang, theme, w] of [['en', 'light', 1280], ['tr', 'dark', 390]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 1000 }, colorScheme: theme })
  const p = await ctx.newPage()
  const errors = []; p.on('pageerror', (e) => errors.push(e.message))
  await p.goto(`http://localhost:3411/login?lang=${lang}`); await p.fill('input[name=email]', 'seller@demo.test'); await p.fill('input[name=password]', 'password123')
  await p.click('button[type=submit]'); await p.waitForURL((u) => !u.pathname.startsWith('/login'))
  await p.goto('http://localhost:3411/seller/stores', { waitUntil: 'networkidle' })
  const radio = p.getByRole('radio', { name: 'Wix' })
  await radio.click(); await p.waitForTimeout(300)
  await radio.scrollIntoViewIfNeeded()
  await p.screenshot({ path: `${out}/stores_wix_${lang}_${theme}.png` })
  console.log(lang, 'errors', errors)
  await ctx.close()
}
await b.close()
