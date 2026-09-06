import { chromium } from 'playwright-core';

const url = 'https://3000-irfx7g2nrndpcpue4mi7t-15166e4a.us4.manus.computer/avery-source.html?desktop-layout-phone-check=1';
const browser = await chromium.launch({
  headless: true,
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

try {
  const desktopContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const phoneContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    deviceScaleFactor: 1,
  });

  const inspect = async (context, screenshotPath) => {
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url, { waitUntil: 'networkidle' });
    const metrics = await page.evaluate(() => {
      const header = document.querySelector('.header');
      const nav = document.querySelector('.nav');
      const hero = document.querySelector('.hero');
      const heroCopy = document.querySelector('.hero-copy');
      const box = node => {
        const rect = node?.getBoundingClientRect();
        return rect ? [Math.round(rect.width), Math.round(rect.height)] : null;
      };
      return {
        layoutWidth: window.innerWidth,
        layoutHeight: window.innerHeight,
        mobileBreakpointMatches: matchMedia('(max-width: 780px)').matches,
        header: box(header),
        navDisplay: nav ? getComputedStyle(nav).display : null,
        navDirection: nav ? getComputedStyle(nav).flexDirection : null,
        hero: box(hero),
        heroCopy: box(heroCopy),
      };
    });
    await page.screenshot({ path: screenshotPath, fullPage: false });
    await page.close();
    return { ...metrics, errors };
  };

  const desktop = await inspect(desktopContext, '/home/ubuntu/screenshots/desktop-layout-reference.png');
  const phone = await inspect(phoneContext, '/home/ubuntu/screenshots/desktop-layout-phone-390.png');
  await desktopContext.close();
  await phoneContext.close();

  const publicContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    deviceScaleFactor: 1,
  });
  const publicPage = await publicContext.newPage();
  const publicErrors = [];
  publicPage.on('pageerror', error => publicErrors.push(error.message));
  await publicPage.goto('https://3000-irfx7g2nrndpcpue4mi7t-15166e4a.us4.manus.computer/', { waitUntil: 'networkidle' });
  const canonicalFrame = publicPage.frames().find(frame => frame.url().includes('/avery-source.html'));
  if (!canonicalFrame) throw new Error('Embedded canonical Avery page was not available in the public site shell.');
  const publicPhone = await canonicalFrame.evaluate(() => ({
    layoutWidth: window.innerWidth,
    mobileBreakpointMatches: matchMedia('(max-width: 780px)').matches,
    headerWidth: Math.round(document.querySelector('.header')?.getBoundingClientRect().width || 0),
    heroWidth: Math.round(document.querySelector('.hero')?.getBoundingClientRect().width || 0),
    navDirection: getComputedStyle(document.querySelector('.nav')).flexDirection,
  }));
  const outerViewport = await publicPage.evaluate(() => document.querySelector('meta[name="viewport"]')?.getAttribute('content'));
  await publicPage.screenshot({ path: '/home/ubuntu/screenshots/public-desktop-layout-phone-390.png', fullPage: false });
  await publicPage.close();
  await publicContext.close();

  const phoneWidths = [320, 360, 375, 390, 412, 430];
  const phoneWidthChecks = [];
  for (const width of phoneWidths) {
    const context = await browser.newContext({
      viewport: { width, height: 844 },
      isMobile: true,
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    await page.goto('https://3000-irfx7g2nrndpcpue4mi7t-15166e4a.us4.manus.computer/', { waitUntil: 'networkidle' });
    const frame = page.frames().find(item => item.url().includes('/avery-source.html'));
    if (!frame) throw new Error(`Embedded canonical Avery page was not available at ${width}px.`);
    phoneWidthChecks.push(await frame.evaluate(viewportWidth => ({
      viewportWidth,
      layoutWidth: window.innerWidth,
      mobileBreakpointMatches: matchMedia('(max-width: 780px)').matches,
      headerWidth: Math.round(document.querySelector('.header')?.getBoundingClientRect().width || 0),
      heroWidth: Math.round(document.querySelector('.hero')?.getBoundingClientRect().width || 0),
    }), width));
    await page.close();
    await context.close();
  }

  const matchesDesktop = phone.layoutWidth === desktop.layoutWidth
    && phone.header?.[0] === desktop.header?.[0]
    && phone.hero?.[0] === desktop.hero?.[0]
    && phone.heroCopy?.[0] === desktop.heroCopy?.[0]
    && phone.navDisplay === desktop.navDisplay
    && phone.navDirection === desktop.navDirection
    && !phone.mobileBreakpointMatches;
  const publicShellMatchesDesktop = publicPhone.layoutWidth === desktop.layoutWidth
    && publicPhone.headerWidth === desktop.header?.[0]
    && publicPhone.heroWidth === desktop.hero?.[0]
    && publicPhone.navDirection === desktop.navDirection
    && !publicPhone.mobileBreakpointMatches
    && outerViewport?.includes('user-scalable=yes');
  const allRequestedPhoneWidthsMatch = phoneWidthChecks.every(check => check.layoutWidth === desktop.layoutWidth
    && check.headerWidth === desktop.header?.[0]
    && check.heroWidth === desktop.hero?.[0]
    && !check.mobileBreakpointMatches);
  const result = { desktop, phone, publicPhone, outerViewport, phoneWidthChecks, matchesDesktop, publicShellMatchesDesktop, allRequestedPhoneWidthsMatch, publicErrors };
  if (!matchesDesktop || !publicShellMatchesDesktop || !allRequestedPhoneWidthsMatch || desktop.errors.length || phone.errors.length || publicErrors.length) {
    throw new Error(`Desktop-layout phone presentation failed: ${JSON.stringify(result)}`);
  }
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}
