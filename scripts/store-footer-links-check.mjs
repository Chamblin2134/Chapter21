import { chromium } from 'playwright-core';

const baseUrl = 'https://3000-i4im4y3b1ciacc6zita4m-b00e4fba.us2.manus.computer/avery-source.html';
const viewports = [
  { name: 'desktop', width: 1280, height: 720 },
  { name: 'phone', width: 390, height: 844, isMobile: true },
];

const browser = await chromium.launch({
  headless: true,
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

try {
  const results = [];
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: Boolean(viewport.isMobile),
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${baseUrl}?store-footer-check=${viewport.name}#store`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.body.classList.contains('store-view-active'));

    const storeState = await page.evaluate(() => ({
      visibleTopLinks: [...document.querySelectorAll('.nav [data-store-footer-link]')]
        .every(link => getComputedStyle(link).display !== 'none'),
      storeLinkVisible: getComputedStyle(document.querySelector('.nav a[href="#store"]')).display !== 'none',
      accountLinkVisible: getComputedStyle(document.querySelector('.nav a[href="#account"]')).display !== 'none',
      footerLinks: [...document.querySelectorAll('.footer-sitemap a')]
        .filter(link => ['#about', '#services', '#addictions'].includes(link.getAttribute('href')))
        .map(link => ({ href: link.getAttribute('href'), text: link.textContent.trim(), visible: getComputedStyle(link).display !== 'none' })),
    }));

    await page.locator('.footer-sitemap a[href="#about"]').click();
    await page.waitForFunction(() => location.hash === '#about' && !document.body.classList.contains('store-view-active'));
    const aboutIsVisible = await page.locator('#about').evaluate(section => !section.classList.contains('site-view-hidden'));
    const footerTopRestored = await page.locator('.nav a[href="#about"]').evaluate(link => getComputedStyle(link).display !== 'none');

    const expectedFooterLinks = ['#about', '#services', '#addictions'];
    const hasExpectedFooterLinks = expectedFooterLinks.every(href => storeState.footerLinks.some(link => link.href === href && link.visible));
    if (!(storeState.visibleTopLinks && storeState.storeLinkVisible && storeState.accountLinkVisible && hasExpectedFooterLinks && aboutIsVisible && footerTopRestored && errors.length === 0)) {
      throw new Error(`Store footer-link placement check failed: ${JSON.stringify({ viewport, storeState, aboutIsVisible, footerTopRestored, errors })}`);
    }
    results.push({ viewport: [viewport.width, viewport.height], checked: true });
    await context.close();
  }
  console.log(JSON.stringify(results));
} finally {
  await browser.close();
}
