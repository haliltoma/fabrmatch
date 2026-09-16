/**
 * Fabrmatch üretici paneli ekran görüntüsü — tasarım doğrulama
 * Kullanım: node tools/screenshot-panel.mjs
 */
import { chromium } from '/Users/laserkopf/.npm/_npx/9833c18b2d85bc59/node_modules/playwright-core/index.mjs';
import { mkdirSync } from 'fs';

const BASE = 'http://localhost:3333';
const OUT  = 'tools/screenshots';

mkdirSync(OUT, { recursive: true });

const pages = [
  { path: '/giris',   name: 'panel-giris' },
  { path: '/panel',   name: 'panel-dashboard' },
];

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile',  width: 390,  height: 844 },
];

const browser = await chromium.launch({ channel: 'chrome' });

for (const vp of viewports) {
  const ctx  = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await ctx.newPage();

  for (const pg of pages) {
    const url  = BASE + pg.path;
    const file = `${OUT}/${vp.name}--${pg.name}.png`;
    console.log(`→ ${vp.name} · ${pg.name} · ${url}`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
    await page.screenshot({ path: file, fullPage: true });
    console.log(`   ✓ ${file}`);
  }

  await ctx.close();
}

await browser.close();
console.log('\nPanel ekran görüntüleri → tools/screenshots');
