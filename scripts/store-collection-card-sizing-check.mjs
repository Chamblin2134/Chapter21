import { chromium } from 'playwright-core';

const url = 'https://3000-irfx7g2nrndpcpue4mi7t-15166e4a.us4.manus.computer/avery-source.html?store-collection-card-sizing-check=1#store';
const browser = await chromium.launch({
  headless: true,
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

try {
  const results = [];
  for (const viewport of [[1280, 720], [390, 844]]) {
    const context = await browser.newContext({ viewport: { width: viewport[0], height: viewport[1] } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => [...document.querySelectorAll('#v9StoreGrid .v9-product')]
      .some(card => card.querySelector('h3')?.textContent?.trim() === 'Recovery Planning' && card.querySelector('.v14-pdf-thumb')));

    const layout = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('#v9StoreGrid .v9-product')]
        .filter(card => getComputedStyle(card).display !== 'none' && card.getBoundingClientRect().width > 0);
      const measurements = cards.map(card => {
        const box = card.getBoundingClientRect();
        return { title: card.querySelector('h3')?.textContent?.trim(), size: [Math.round(box.width), Math.round(box.height)], overflow: card.scrollHeight > card.clientHeight };
      });
      const published = cards.find(card => card.querySelector('h3')?.textContent?.trim() === 'Recovery Planning');
      const empty = cards.find(card => card.querySelector('h3')?.textContent?.trim() === 'Coping Skills');
      const bounds = selector => {
        const box = published?.querySelector(selector)?.getBoundingClientRect();
        return box ? [Math.round(box.width), Math.round(box.height)] : null;
      };
      const emptyItem = empty?.querySelector('.v14-item')?.getBoundingClientRect();
      const image = published?.querySelector('.v14-pdf-thumb');
      return {
        measurements,
        publishedThumb: bounds('.v14-thumb'),
        publishedImage: bounds('.v14-pdf-thumb'),
        emptyItem: emptyItem ? [Math.round(emptyItem.width), Math.round(emptyItem.height)] : null,
        objectFit: image ? getComputedStyle(image).objectFit : '',
        arrows: published ? [...published.querySelectorAll('.v14-arrow')].map(button => !button.hidden) : [],
      };
    });

    const published = page.locator('#v9StoreGrid .v9-product').filter({ hasText: 'Recovery Planning' }).first();
    await published.locator('.v14-preview').click();
    await page.waitForFunction(() => document.getElementById('v14PreviewModal')?.classList.contains('open'));
    const protectedPreviewPages = await page.locator('#v14ProtectedPreviewPages img').count();
    await page.evaluate(() => window.v14ClosePreview?.());

    const publicCard = page.locator('#v15PublicBrowse [data-v15-public-resource]').filter({ hasText: 'Recovery Planning' }).first();
    await publicCard.locator('[data-v15-public-cart]').click();
    await page.locator('#v14CartToggle').click();
    await page.waitForFunction(() => /Cart\s*1/.test(document.getElementById('v14HeaderCart')?.textContent || ''));
    await page.locator('#v14CartPanel button').filter({ hasText: 'Remove' }).first().evaluate(button => button.click());
    await page.waitForFunction(() => /Cart\s*0/.test(document.getElementById('v14HeaderCart')?.textContent || ''));
    await page.screenshot({ path: `/home/ubuntu/screenshots/store-collection-card-${viewport[0]}.png`, fullPage: false });

    const expectedHeight = viewport[0] <= 620 ? 308 : 330;
    const equalFixedCards = layout.measurements.length > 1 && layout.measurements.every(card => card.size[1] === expectedHeight && !card.overflow);
    const containedLargerPreview = layout.publishedThumb?.[1] === 112 && layout.publishedImage && layout.publishedImage[0] <= layout.publishedThumb[0] && layout.publishedImage[1] <= layout.publishedThumb[1] && layout.objectFit === 'contain';
    const result = { viewport, layout, protectedPreviewPages, equalFixedCards, containedLargerPreview, errors };
    if (!equalFixedCards || !containedLargerPreview || layout.emptyItem?.[0] <= 100 || layout.arrows.some(visible => !visible) || protectedPreviewPages !== 5 || errors.length) {
      throw new Error(`Store collection-card sizing check failed: ${JSON.stringify(result)}`);
    }
    results.push(result);
    await context.close();
  }
  console.log(JSON.stringify(results));
} finally {
  await browser.close();
}
