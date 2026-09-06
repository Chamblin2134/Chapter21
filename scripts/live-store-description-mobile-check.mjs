import { chromium } from 'playwright-core';

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
  await page.goto('https://averyinsti-qnbmu2v8.manus.space/avery-source.html?live-description-mobile-check=1#store', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => [...document.querySelectorAll('#v15PublicBrowse [data-v15-public-resource]')]
    .some(card => /Recovery Planning/i.test(card.querySelector('h4')?.textContent || '')));

  const card = page.locator('#v15PublicBrowse [data-v15-public-resource]').filter({ hasText: 'Recovery Planning' }).first();
  const cardText = await card.textContent();
  const cover = await card.locator('.v15-public-cover img').evaluate(image => ({
    source: image.getAttribute('src') || '',
    alt: image.getAttribute('alt') || '',
    box: [Math.round(image.getBoundingClientRect().width), Math.round(image.getBoundingClientRect().height)],
  }));
  await card.locator('[data-v15-detail]').click();
  await page.waitForFunction(() => document.getElementById('v15ResourceDetail')?.open);
  const detailText = await page.locator('#v15ResourceDetail').textContent();
  await page.screenshot({ path: '/home/ubuntu/screenshots/live-store-description-mobile-390.png' });
  await page.locator('#v15ResourceDetail [data-v15-dialog-back]').click();
  await page.waitForFunction(() => !document.getElementById('v15ResourceDetail')?.open && document.activeElement?.id === 'v15PublicSearch');

  await card.locator('[data-v15-public-preview]').click();
  await page.waitForFunction(() => document.getElementById('v14PreviewModal')?.classList.contains('open'));
  const preview = await page.evaluate(() => ({
    images: document.querySelectorAll('#v14ProtectedPreviewPages img').length,
    iframeSource: document.getElementById('v14PreviewFrame')?.getAttribute('src') || '',
  }));
  await page.evaluate(() => window.v14ClosePreview?.());

  const result = { cardText, cover, detailText, preview, errors };
  if (!cardText?.includes('A practical, structured resource designed to help') || !cover.source.includes('resource-thumbnails') || !/Watermarked preview page 1/i.test(cover.alt) || cover.box[1] !== 156 || !detailText?.includes('support systems, routines, high-risk situations') || preview.images !== 5 || preview.iframeSource !== 'about:blank' || errors.length) {
    throw new Error(`Live Store description mobile validation failed: ${JSON.stringify(result)}`);
  }
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}
