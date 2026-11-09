// Smoke-test the language switcher on the dev server.
// Run: node scripts/verify-i18n.mjs [url]
import { chromium } from 'playwright';

const url = process.argv[2] ?? 'http://localhost:5200';
const browser = await chromium.launch({ headless: true, channel: 'chrome' }).catch(() => chromium.launch({ headless: true }));
const page = await browser.newPage();
await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

const results = [];
const title = await page.locator('.panel .title').textContent();
results.push(['en', title.trim()]);

for (const [code, expect] of [['id', 'Rubah'], ['zh', ''], ['ru', ''], ['ja', '']]) {
  await page.locator('.lang select').selectOption(code);
  await page.waitForTimeout(1200);
  const name = await page.locator('.panel .title').textContent();
  const group = await page.locator('.nav-label').nth(2).textContent();
  results.push([code, name.trim(), group.trim()]);
}
console.log(JSON.stringify(results, null, 1));
await browser.close();
