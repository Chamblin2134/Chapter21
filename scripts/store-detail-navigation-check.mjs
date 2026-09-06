import { chromium } from 'playwright-core';

const baseUrl = 'https://3000-irfx7g2nrndpcpue4mi7t-15166e4a.us4.manus.computer/avery-source.html';
const viewports = [
  { name: 'desktop', width: 1280, height: 720 },
  { name: 'mobile', width: 390, height: 844 },
];

const browser = await chromium.launch({
  headless: true,
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

try {
  const results = [];
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${baseUrl}?store-detail-navigation-check=${viewport.name}#store`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => Boolean(window.AveryStoreManagerApi && document.getElementById('v15PublicBrowse')));

    const staged = await page.evaluate(() => {
      const api = window.AveryStoreManagerApi;
      const category = Object.keys(api.resourceDb)[0] || 'Recovery Planning';
      const original = api.resourceDb[category];
      api.resourceDb[category] = [{
        remoteId: '__store_detail_navigation_validation__',
        title: 'Store Detail Navigation Validation',
        description: 'Temporary in-memory browser validation card.',
        type: 'Worksheet',
        pages: 1,
        price: '$0.00',
        priceCents: 0,
        category,
        storagePath: '__browser_validation_only__',
        thumbnailUrl: null,
        seriesName: null,
        subtitle: null,
        audience: 'Client',
        topicTags: [],
      }];
      window.dispatchEvent(new Event('avery:store-manager-catalog-changed'));
      return { category, original };
    });

    const v15Card = page.locator('[data-v15-public-resource="__store_detail_navigation_validation__"]');
    await v15Card.locator('[data-v15-detail]').click();
    await page.waitForFunction(() => document.getElementById('v15ResourceDetail')?.open);
    const v15Back = page.locator('#v15ResourceDetail [data-v15-dialog-back]');
    const v15BackVisible = await v15Back.isVisible();
    const v15BackText = await v15Back.textContent();
    await page.screenshot({ path: `/home/ubuntu/screenshots/store-detail-navigation-${viewport.name}-v15.png` });
    await v15Back.click();
    await page.waitForFunction(() => !document.getElementById('v15ResourceDetail')?.open && document.activeElement?.id === 'v15PublicSearch');

    await page.evaluate(() => window.v9OpenClient('Coping Skills', 0));
    await page.waitForFunction(() => document.getElementById('v9Preview')?.classList.contains('open'));
    const legacyBack = page.locator('#v9Preview button', { hasText: 'Back to Collection' });
    const legacyBackVisible = await legacyBack.isVisible();
    const legacyBackText = await legacyBack.textContent();
    await page.screenshot({ path: `/home/ubuntu/screenshots/store-detail-navigation-${viewport.name}-legacy.png` });
    await legacyBack.click();
    await page.waitForFunction(() => {
      const promptClosed = !document.getElementById('v9Preview')?.classList.contains('open');
      const active = document.activeElement;
      return promptClosed && (active?.matches('[data-v11-client-filter].active') || active?.matches('[data-v9-clin-filter].active'));
    });

    await page.evaluate(({ category, original }) => {
      window.AveryStoreManagerApi.resourceDb[category] = original;
      window.dispatchEvent(new Event('avery:store-manager-catalog-changed'));
    }, staged);

    const result = {
      viewport: [viewport.width, viewport.height],
      v15BackVisible,
      v15BackText: v15BackText?.trim(),
      legacyBackVisible,
      legacyBackText: legacyBackText?.trim(),
      errors,
    };
    if (!result.v15BackVisible || result.v15BackText !== '← Back to Store Results' || !result.legacyBackVisible || result.legacyBackText !== '← Back to Collection' || result.errors.length) {
      throw new Error(`Store detail navigation check failed: ${JSON.stringify(result)}`);
    }
    results.push(result);
    await context.close();
  }
  console.log(JSON.stringify(results));
} finally {
  await browser.close();
}
