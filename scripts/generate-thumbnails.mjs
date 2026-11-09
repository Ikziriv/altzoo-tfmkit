import { copyFile, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const speciesSource = await readFile(resolve('src/data/species.ts'), 'utf8');
const ids = [...speciesSource.matchAll(/^    id: '([^']+)'/gm)].map((match) => match[1]);
if (ids.length === 0) throw new Error('No species found in src/data/species.ts');

const temporaryOutput = await mkdtemp(join(tmpdir(), 'zoojelly-thumbs-'));
const output = resolve('src/assets/thumbs');
let server;
let browser;

async function alphaBounds(page) {
  return page.locator('canvas').evaluate((canvas) => {
    const copy = document.createElement('canvas');
    copy.width = canvas.width;
    copy.height = canvas.height;
    const context = copy.getContext('2d');
    context.drawImage(canvas, 0, 0);
    const { data } = context.getImageData(0, 0, copy.width, copy.height);
    let minX = copy.width;
    let minY = copy.height;
    let maxX = -1;
    let maxY = -1;
    let pixels = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] <= 8) continue;
      const pixel = (i - 3) / 4;
      const x = pixel % copy.width;
      const y = Math.floor(pixel / copy.width);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      pixels += 1;
    }
    return { pixels, minX, minY, maxX, maxY, width: copy.width, height: copy.height };
  });
}

try {
  server = await createServer({
    configFile: resolve('vite.config.ts'),
    logLevel: 'error',
    server: { host: '127.0.0.1', port: 5190, strictPort: true },
  });
  await server.listen();
  browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'chrome' } : {}) });

  for (const id of ids) {
    const page = await browser.newPage({
      viewport: { width: 480, height: 320 },
      deviceScaleFactor: 1,
      colorScheme: 'light',
      reducedMotion: 'reduce',
    });
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    try {
      await page.goto(`http://127.0.0.1:5190/?snap=${encodeURIComponent(id)}`, { waitUntil: 'commit', timeout: 120000 });
      await page.waitForFunction(() => document.body.dataset.ready === 'true' || Boolean(document.body.dataset.error), null, { timeout: 120000 });
      const snapshotError = await page.evaluate(() => document.body.dataset.error);
      if (snapshotError) throw new Error(snapshotError);
      if (pageErrors.length > 0) throw new Error(pageErrors.join('; '));

      await page.waitForTimeout(150);
      const bounds = await alphaBounds(page);
      if (bounds.pixels < 100) throw new Error('Rendered image is empty or nearly transparent');
      if (bounds.minX <= 1 || bounds.minY <= 1 || bounds.maxX >= bounds.width - 2 || bounds.maxY >= bounds.height - 2) {
        throw new Error(`Rendered image is clipped: ${JSON.stringify(bounds)}`);
      }
      const visibleWidth = (bounds.maxX - bounds.minX + 1) / bounds.width;
      const visibleHeight = (bounds.maxY - bounds.minY + 1) / bounds.height;
      if (Math.max(visibleWidth, visibleHeight) < 0.4) {
        throw new Error(`Rendered subject is too small: ${JSON.stringify(bounds)}`);
      }

      await page.locator('canvas').screenshot({ path: join(temporaryOutput, `${id}.png`), omitBackground: true });
      console.log(`✓ ${id} (${bounds.pixels} visible pixels)`);
    } catch (error) {
      throw new Error(`${id}: ${error.message}`);
    } finally {
      await page.close();
    }
  }

  await mkdir(output, { recursive: true });
  for (const id of ids) await copyFile(join(temporaryOutput, `${id}.png`), join(output, `${id}.png`));
  console.log(`Generated ${ids.length} consistent thumbnails in ${output}`);
} finally {
  await browser?.close();
  await server?.close();
  await rm(temporaryOutput, { recursive: true, force: true });
}
