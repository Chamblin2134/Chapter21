import { chromium } from 'playwright-core';

const baseUrl = 'https://3000-irfx7g2nrndpcpue4mi7t-15166e4a.us4.manus.computer/avery-source.html';
const viewports = [{ name: 'desktop', width: 1280, height: 720 }, { name: 'mobile', width: 390, height: 844 }];
const browser = await chromium.launch({ headless: true, executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage'] });

try {
  const results = [];
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
    await context.addInitScript(() => localStorage.removeItem('avery-institute-store-cart-v1'));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/rest/v1/resource_series**', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify([{ id: '__rebuilding__', title: 'Rebuilding My Life', display_name: 'Rebuilding My Life Series', brand: 'Chapter 21', description: 'Build a healthier life through responsibility and growth.', category: 'Responsibility & Personal Growth', category_color: '#3F7A4F', cover_image: null, bundle_price_cents: 0, is_published: true }]) }));
    await page.goto(`${baseUrl}?series-check=${viewport.name}#store`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.AveryStoreManagerApi && document.getElementById('v15PublicBrowse')));
    await page.evaluate(() => {
      const api = window.AveryStoreManagerApi;
      const make = (remoteId, title, order, sellingOption) => ({ remoteId, title, description: `${title} description`, category: 'Recovery Planning', topicTags: ['Responsibility & Personal Growth'], type: 'Workbook', audience: 'Client', pages: 2, price: '$5.00', priceCents: 500, storagePath: `__${remoteId}__.pdf`, fileName: `${remoteId}.pdf`, thumbnailUrl: null, previewPageUrls: [], seriesId: '__rebuilding__', seriesName: 'Rebuilding My Life Series', seriesOrder: order, sellingOption });
      window.__seriesOriginals = structuredClone(api.resourceDb);
      Object.keys(api.resourceDb).forEach(key => delete api.resourceDb[key]);
      Object.assign(api.resourceDb, { 'Recovery Planning': [make('__series_two__', 'Daily Structure Workbook', 2, 'bundle_only'), make('__series_one__', 'Responsibility Reflection', 1, 'individual_and_bundle'), make('__series_three__', 'Personal Growth Journal', 3, 'individual')] });
      window.dispatchEvent(new Event('avery:store-manager-catalog-changed'));
    });
    await page.waitForSelector('[data-v15-series-card="__rebuilding__"]');
    const cardText = await page.locator('[data-v15-series-card="__rebuilding__"]').innerText();
    await page.locator('[data-v15-series-card="__rebuilding__"] [data-v15-series-cart]').click();
    const cartAfterBundle = await page.evaluate(() => JSON.parse(localStorage.getItem('avery-institute-store-cart-v1') || '[]').length);
    await page.evaluate(() => { const panel = document.getElementById('v14CartPanel'); if (panel) panel.hidden = true; });
    await page.locator('[data-v15-series-details="__rebuilding__"]').dispatchEvent('click');
    await page.waitForSelector('#v15ResourceDetail[open]');
    const orderedTitles = await page.locator('#v15ResourceDetail .v15-series-member strong').allTextContents();
    await page.evaluate(() => document.getElementById('v15ResourceDetail')?.close());
    const observations = await page.evaluate(() => ({ cart: JSON.parse(localStorage.getItem('avery-institute-store-cart-v1') || '[]').map(item => item.resourceId).sort() }));
    await page.evaluate(() => {
      const api = window.AveryStoreManagerApi;
      Object.keys(api.resourceDb).forEach(key => delete api.resourceDb[key]);
      Object.assign(api.resourceDb, window.__seriesOriginals);
      localStorage.removeItem('avery-institute-store-cart-v1');
      delete window.__seriesOriginals;
      window.dispatchEvent(new Event('avery:store-manager-catalog-changed'));
    });
    const pass = cardText.includes('Rebuilding My Life Series') && cardText.toLowerCase().includes('3 resources')
      && JSON.stringify(orderedTitles) === JSON.stringify(['Responsibility Reflection', 'Daily Structure Workbook', 'Personal Growth Journal'])
      && cartAfterBundle === 2
      && JSON.stringify(observations.cart) === JSON.stringify(['__series_one__', '__series_two__'])
      && errors.length === 0;
    if (!pass) throw new Error(`Series check failed: ${JSON.stringify({ viewport, cardText, orderedTitles, observations, errors })}`);
    results.push({ viewport: [viewport.width, viewport.height], checked: true });
    await context.close();
  }
  console.log(JSON.stringify(results));
} finally {
  await browser.close();
}
