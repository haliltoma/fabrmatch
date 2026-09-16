/**
 * Fabrmatch storefront ekran görüntüsü — altın oran tasarım doğrulama
 * Kullanım: node tools/screenshot-storefront.mjs
 */
import { chromium } from '/Users/laserkopf/.npm/_npx/9833c18b2d85bc59/node_modules/playwright-core/index.mjs';

const BASE = 'http://localhost:4321';
const OUT  = 'tools/screenshots';

const pages = [
  { path: '/',             name: 'anasayfa' },
  { path: '/urunler',      name: 'urunler' },
  { path: '/ozel-tasarim', name: 'ozel-tasarim' },
  { path: '/sepet',        name: 'sepet' },
  { path: '/giris',        name: 'giris' },
];

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet',  width: 768,  height: 1024 },
  { name: 'mobile',  width: 390,  height: 844 },
];

const browser = await chromium.launch({ channel: 'chrome', headless: true });

import { mkdir } from 'fs/promises';
await mkdir(OUT, { recursive: true });

for (const vp of viewports) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await ctx.newPage();

  for (const p of pages) {
    const url = BASE + p.path;
    console.log(`→ ${vp.name} · ${p.name} · ${url}`);
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 15_000 });
      // GSAP + React adaları yüklensin
      await page.waitForTimeout(800);
      // Sayfayı scroll et — ScrollTrigger animasyonlarını tetikle
      await page.evaluate(async () => {
        await new Promise(resolve => {
          let total = 0;
          const step = 400;
          const id = setInterval(() => {
            window.scrollBy(0, step);
            total += step;
            if (total >= document.body.scrollHeight) {
              window.scrollTo(0, 0);
              clearInterval(id);
              setTimeout(resolve, 300);
            }
          }, 80);
        });
      });
      await page.waitForTimeout(400);
      const file = `${OUT}/${vp.name}--${p.name}.png`;
      await page.screenshot({ path: file, fullPage: true });
      console.log(`   ✓ ${file}`);
    } catch (err) {
      console.error(`   ✗ ${err.message}`);
    }
  }

  await ctx.close();
}

await browser.close();
console.log('\nTüm ekran görüntüleri alındı →', OUT);
