import { chromium } from 'playwright-core';

const url = 'https://3000-irfx7g2nrndpcpue4mi7t-15166e4a.us4.manus.computer/avery-source.html?store-prompt-close-mobile-check=1#store';
const browser = await chromium.launch({
  headless: true,
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => Boolean(window.AveryStoreManagerApi && document.getElementById('v15PublicBrowse')));

  const staged = await page.evaluate(() => {
    const api = window.AveryStoreManagerApi;
    const category = Object.keys(api.resourceDb)[0] || 'Recovery Planning';
    const original = api.resourceDb[category];
    api.resourceDb[category] = [{
      remoteId: '__prompt_close_mobile_validation__',
      title: 'Worksheet Prompt Close Validation',
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
    return { category, originalCount: original?.length || 0 };
  });

  await page.locator('#v15PublicBrowse [data-v15-detail]').click();
  await page.waitForFunction(() => document.getElementById('v15ResourceDetail')?.open);
  const closeControl = await page.locator('#v15ResourceDetail [data-v15-dialog-x]').evaluate(button => ({
    visible: getComputedStyle(button).display !== 'none',
    text: button.textContent?.trim(),
    ariaLabel: button.getAttribute('aria-label'),
  }));
  await page.locator('#v15ResourceDetail [data-v15-dialog-x]').click();
  await page.waitForFunction(() => !document.getElementById('v15ResourceDetail')?.open);
  await page.evaluate(({ category }) => {
    window.AveryStoreManagerApi.resourceDb[category] = [];
    window.dispatchEvent(new Event('avery:store-manager-catalog-changed'));
  }, staged);

  const result = { width: await page.evaluate(() => window.innerWidth), closeControl, errors };
  if (result.width !== 390 || !result.closeControl.visible || result.closeControl.text !== '×' || result.closeControl.ariaLabel !== 'Close resource details' || result.errors.length) {
    throw new Error(`Store prompt close test failed: ${JSON.stringify(result)}`);
  }
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}
