import { chromium } from 'playwright-core';

const url = 'https://3000-irfx7g2nrndpcpue4mi7t-15166e4a.us4.manus.computer/avery-source.html?mobile-store-unsigned-check=1#store';
const browser = await chromium.launch({
  headless: true,
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => Boolean(document.getElementById('v15PublicBrowse')));
  await page.waitForFunction(() => [...document.querySelectorAll('#v15PublicBrowse [data-v15-public-resource]')]
    .some(card => Boolean(card.querySelector('.v15-public-cover img'))));

  const initial = await page.evaluate(() => ({
    width: window.innerWidth,
    mobileBreakpointMatches: matchMedia('(max-width: 780px)').matches,
    managerVisible: (() => {
      const manager = document.getElementById('v14Admin');
      return Boolean(manager && !manager.hidden && getComputedStyle(manager).display !== 'none');
    })(),
    legacyUploadControlsVisible: [...document.querySelectorAll('#store .v14-category-upload')]
      .filter(node => getComputedStyle(node).display !== 'none').length,
    cards: document.querySelectorAll('#v15PublicBrowse [data-v15-public-resource]').length,
  }));

  const namedThumbnailChecks = await page.evaluate(() => [...document.querySelectorAll('#v15PublicBrowse [data-v15-public-resource]')]
    .filter(card => Boolean(card.querySelector('.v15-public-cover img')))
    .slice(0, 2)
    .map(card => {
      const cover = card.querySelector('.v15-public-cover');
      const image = cover?.querySelector('img');
      const coverBox = cover?.getBoundingClientRect();
      const imageBox = image?.getBoundingClientRect();
      return {
        title: card.querySelector('h4')?.textContent?.trim() || '',
        cover: coverBox ? [Math.round(coverBox.width), Math.round(coverBox.height)] : null,
        image: imageBox ? [Math.round(imageBox.width), Math.round(imageBox.height)] : null,
        contained: Boolean(coverBox && (!imageBox || (imageBox.width <= coverBox.width && imageBox.height <= coverBox.height))),
      };
    }));

  const openNamedPreview = async index => {
    const title = await page.evaluate(cardIndex => {
      const card = [...document.querySelectorAll('#v15PublicBrowse [data-v15-public-resource]')]
        .filter(item => Boolean(item.querySelector('.v15-public-cover img')))[cardIndex];
      card?.querySelector('[data-v15-public-preview]')?.click();
      return card?.querySelector('h4')?.textContent?.trim() || null;
    }, index);
    if (!title) throw new Error(`Published watermarked preview card not found at index: ${index}`);
    await page.waitForFunction(() => document.getElementById('v14PreviewModal')?.classList.contains('open'));
    const images = await page.locator('#v14ProtectedPreviewPages img').count();
    await page.evaluate(() => window.v14ClosePreview?.());
    return { title, images };
  };
  const namedPreviewChecks = [];
  for (let index = 0; index < Math.min(2, namedThumbnailChecks.length); index += 1) namedPreviewChecks.push(await openNamedPreview(index));

  await page.locator('#v15PublicBrowse [data-v15-detail]').first().click();
  await page.waitForFunction(() => document.getElementById('v15ResourceDetail')?.open);
  const promptClose = await page.locator('#v15ResourceDetail [data-v15-dialog-x]').evaluate(button => ({
    text: button.textContent?.trim(),
    ariaLabel: button.getAttribute('aria-label'),
  }));
  await page.locator('#v15ResourceDetail [data-v15-dialog-x]').click();
  await page.waitForFunction(() => !document.getElementById('v15ResourceDetail')?.open);

  await page.locator('#v15PublicBrowse [data-v15-public-cart]').first().click();
  await page.locator('#v14CartToggle').click();
  await page.waitForFunction(() => /Cart\s*1/.test(document.getElementById('v14HeaderCart')?.textContent || ''));
  const removeButton = page.locator('#v14CartPanel button').filter({ hasText: 'Remove' }).first();
  await removeButton.evaluate(button => button.click());
  await page.waitForFunction(() => /Cart\s*0/.test(document.getElementById('v14HeaderCart')?.textContent || ''));
  await page.locator('.avery-cart-backdrop.is-open').click({ position: { x: 1, y: 1 } });
  await page.waitForFunction(() => !document.getElementById('v14CartPanel')?.classList.contains('open'));

  await page.screenshot({ path: '/home/ubuntu/screenshots/store-unsigned-mobile-390.png', fullPage: false });
  const namedPreviewsAreCompact = namedThumbnailChecks.length >= 1
    && namedThumbnailChecks.every(check => check.cover?.[1] === 168 && check.contained);
  const namedPreviewsOpened = namedPreviewChecks.every(check => check.images > 0);
  const promptCloseWorks = promptClose.text === '×' && promptClose.ariaLabel === 'Close resource details';
  const result = { ...initial, namedThumbnailChecks, namedPreviewsAreCompact, namedPreviewChecks, namedPreviewsOpened, promptClose, promptCloseWorks, cartCleared: true, pageErrors: errors };
  if (result.width !== 1280 || result.mobileBreakpointMatches || result.managerVisible || result.legacyUploadControlsVisible !== 0 || result.cards < 1 || !result.namedPreviewsAreCompact || !result.namedPreviewsOpened || !result.promptCloseWorks || result.pageErrors.length) {
    throw new Error(`Unsigned 390 px Store flow failed: ${JSON.stringify(result)}`);
  }
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}
