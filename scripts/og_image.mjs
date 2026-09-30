// Usage: node scripts/og_image.mjs
// Draws the default link-preview image (1200 × 630) in English and Turkish into public/og/, from
// the site's own tokens, fonts and printed-part silhouettes. Re-run after a brand change.
import { chromium } from 'playwright'
import { mkdirSync, readFileSync } from 'node:fs'

const font = (pkg, file) =>
  readFileSync(`node_modules/@fontsource-variable/${pkg}/files/${file}`).toString('base64')
const display = font('bricolage-grotesque', 'bricolage-grotesque-latin-wght-normal.woff2')
const displayExt = font('bricolage-grotesque', 'bricolage-grotesque-latin-ext-wght-normal.woff2')
const body = font('instrument-sans', 'instrument-sans-latin-wght-normal.woff2')
const bodyExt = font('instrument-sans', 'instrument-sans-latin-ext-wght-normal.woff2')
// latin-ext carries the Turkish letters (ş, ğ, ı, İ)
const EXT =
  'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF'

const copy = {
  en: {
    title: 'Custom 3D printing,<br/>made to order.',
    line: 'Upload a model, see the delivered price, and a verified maker nearby prints it.',
    chips: ['Price without an account', 'Payment held until delivery', 'Verified makers'],
  },
  tr: {
    title: 'Siparişe özel<br/>3D baskı.',
    line: 'Modelini yükle, kapıya teslim fiyatını gör; yakınındaki doğrulanmış bir üretici bassın.',
    chips: ['Hesapsız fiyat', 'Ödeme teslimata kadar bekler', 'Doğrulanmış üreticiler'],
  },
}

const part = (d, color, extra = '') => `
  <svg viewBox="0 0 120 120" width="150" height="150">
    <defs>
      <pattern id="l${color.slice(1)}" width="4" height="3.2" patternUnits="userSpaceOnUse">
        <rect width="4" height="1" fill="#15181c" fill-opacity="0.18"/>
      </pattern>
      <mask id="m${color.slice(1)}"><g fill="#fff">${d}</g>${extra}</mask>
    </defs>
    <g mask="url(#m${color.slice(1)})">
      <rect width="120" height="120" fill="${color}"/>
      <rect width="120" height="120" fill="url(#l${color.slice(1)})"/>
    </g>
  </svg>`

const parts = [
  part(
    '<path d="M42 14H78C78 32 93 44 93 66C93 92 83 108 75 110H45C37 108 27 92 27 66C27 44 42 32 42 14Z"/>',
    '#2f7d8b'
  ),
  part(
    '<path d="M24 48H96L88 110H32Z"/><path d="M20 36H100V50H20Z"/><ellipse cx="46" cy="22" rx="8" ry="15" transform="rotate(-24 46 22)"/><ellipse cx="74" cy="22" rx="8" ry="15" transform="rotate(24 74 22)"/><ellipse cx="60" cy="16" rx="7" ry="15"/>',
    '#e7a79a'
  ),
  part(
    '<path d="M60 10C77 24 81 46 79 86H41C39 46 43 24 60 10Z"/><path d="M42 62L24 94V110L42 94ZM78 62L96 94V110L78 94Z"/><path d="M48 86H72L68 100H52Z"/>',
    '#f0501e',
    '<circle cx="60" cy="44" r="9" fill="#000"/>'
  ),
]

const html = (c) => `<!doctype html><html><head><style>
  @font-face { font-family: D; src: url(data:font/woff2;base64,${display}) format('woff2'); font-weight: 200 800; }
  @font-face { font-family: B; src: url(data:font/woff2;base64,${body}) format('woff2'); font-weight: 400 700; }
  @font-face { font-family: D; src: url(data:font/woff2;base64,${displayExt}) format('woff2'); font-weight: 200 800; unicode-range: ${EXT}; }
  @font-face { font-family: B; src: url(data:font/woff2;base64,${bodyExt}) format('woff2'); font-weight: 400 700; unicode-range: ${EXT}; }
  * { margin: 0; box-sizing: border-box; }
  body { width: 1200px; height: 630px; background: #f5f2ec; font-family: B; color: #15181c;
    background-image: repeating-linear-gradient(to bottom, rgb(21 24 28 / 0.06) 0 1px, transparent 1px 6px);
    padding: 64px 72px; display: grid; grid-template-columns: 1fr 360px; gap: 40px; border-bottom: 18px solid #c8f53c; }
  .logo { display: flex; align-items: center; gap: 14px; font-family: D; font-weight: 600; font-size: 34px; letter-spacing: -0.02em; }
  .mark { display: flex; flex-direction: column; gap: 5px; width: 40px; }
  .mark i { display: block; height: 7px; border-radius: 1px; background: #15181c; }
  .mark i:nth-child(2) { width: 80%; background: #f0501e; } .mark i:nth-child(3) { width: 60%; }
  h1 { font-family: D; font-weight: 650; font-size: 70px; line-height: 1.02; letter-spacing: -0.03em; margin-top: 56px; }
  p { font-size: 26px; line-height: 1.4; color: #363d45; margin-top: 22px; max-width: 640px; }
  .chips { display: flex; gap: 10px; margin-top: 30px; flex-wrap: wrap; }
  .chips span { border: 2px solid #15181c; border-radius: 999px; padding: 5px 12px; font-weight: 600; font-size: 16px; background: #fff; }
  .art { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; align-content: center; }
  .tile { border: 3px solid #15181c; border-radius: 14px; display: grid; place-items: center; height: 170px; }
  .tile:nth-child(1) { background: #ffc629; } .tile:nth-child(2) { background: #8fd3f4; }
  .tile:nth-child(3) { background: #c8f53c; grid-column: span 2; }
</style></head><body>
  <div>
    <div class="logo"><span class="mark"><i></i><i></i><i></i></span>Fabrmatch</div>
    <h1>${c.title}</h1>
    <p>${c.line}</p>
    <div class="chips">${c.chips.map((x) => `<span>${x}</span>`).join('')}</div>
  </div>
  <div class="art">${parts.map((p) => `<div class="tile">${p}</div>`).join('')}</div>
</body></html>`

mkdirSync('public/og', { recursive: true })
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })
for (const [lang, c] of Object.entries(copy)) {
  await page.setContent(html(c))
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: `public/og/fabrmatch-${lang}.png` })
  console.log(`public/og/fabrmatch-${lang}.png`)
}
await browser.close()
