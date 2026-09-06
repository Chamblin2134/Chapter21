import { chromium } from 'playwright-core';

const baseUrl = 'https://3000-irfx7g2nrndpcpue4mi7t-15166e4a.us4.manus.computer/avery-source.html';
const viewports = [
  { name: 'desktop', width: 1280, height: 720 },
  { name: 'mobile', width: 390, height: 844 },
];
const scenarios = [
  { card: 'recovery', topic: 'recovery-3', category: 'Triggers, Cravings & Relapse', tag: 'Triggers, Cravings & Relapse', title: 'Relapse Prevention Plan' },
  { card: 'relationships', topic: 'relationships-3', category: 'Relationships & Boundaries', tag: 'Relationships & Boundaries', title: 'Healthy Boundaries Worksheet' },
  { card: 'behavioral', topic: 'behavioral-1', category: 'Addiction Education', tag: 'Addiction Education', title: 'Understanding the Habit Cycle' },
  { card: 'purpose', topic: 'purpose-3', category: 'Meaning, Purpose & Spirituality', tag: 'Meaning, Purpose & Spirituality', title: 'Meaning and Purpose Reflection' },
];

const browser = await chromium.launch({
  headless: true,
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

try {
  const results = [];
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
    const page = await context.newPage();
    const errors = [];
    const persistenceWrites = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method()) && request.url().includes('supabase.co')) persistenceWrites.push(`${request.method()} ${request.url()}`);
    });
    await page.goto(`${baseUrl}?homepage-topic-resource-cart-check=${viewport.name}`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => Boolean(window.AveryStoreManagerApi));
    await page.evaluate((items) => {
      const api = window.AveryStoreManagerApi;
      for (const item of items) api.resourceDb[item.category] = [item];
      window.dispatchEvent(new Event('avery:store-manager-catalog-changed'));
    }, scenarios.map((scenario, index) => ({
      remoteId: `__homepage_prompt_resource_${index}__`,
      title: scenario.title,
      description: 'Temporary in-memory browser validation resource.',
      category: scenario.category,
      topicTags: [scenario.tag],
      type: 'Worksheet',
      pages: 1,
      price: '$4.99',
      priceCents: 499,
      storagePath: `validation/${index}.pdf`,
      fileName: `validation-${index}.pdf`,
      thumbnailUrl: null,
      previewPageUrls: [],
      audience: 'Client',
    })));

    const scenarioResults = [];
    for (const [index, scenario] of scenarios.entries()) {
      await page.locator(`[data-info="${scenario.card}"]`).click();
      const modal = page.locator(`#info-${scenario.card}`);
      await modal.locator(`[data-topic="${scenario.topic}"]`).click();
      const resource = modal.locator(`[data-v14-topic-resource="__homepage_prompt_resource_${index}__"]`);
      await resource.waitFor({ state: 'visible' });
      await resource.scrollIntoViewIfNeeded();
      if (index === scenarios.length - 1) {
        await page.screenshot({ path: `/home/ubuntu/screenshots/homepage-topic-resources-${viewport.name}.png`, fullPage: false });
      }
      const schedule = modal.locator('a', { hasText: 'Schedule an Appointment' });
      const scheduleVisible = await schedule.isVisible();
      const scheduleHref = await schedule.getAttribute('href');
      const unrelatedVisible = await modal.locator('[data-v14-topic-resource]').count();
      await resource.locator('[data-v14-topic-cart]').click();
      const cartCount = await page.locator('#v14CartCount').textContent();
      const cartOpen = await page.locator('#v14CartPanel').evaluate(node => !node.hidden);
      scenarioResults.push({ topic: scenario.topic, title: await resource.locator('strong').textContent(), scheduleVisible, scheduleHref, relatedCount: unrelatedVisible, cartCount, cartOpen });
      await page.evaluate(() => document.querySelector('#v14CartPanel [data-v14-remove-cart]')?.click());
      await page.waitForFunction(() => document.getElementById('v14CartCount')?.textContent === '0');
      await modal.locator('.close-info').click();
    }

    const valid = scenarioResults.every(result => result.scheduleVisible && result.scheduleHref === '#contact' && result.relatedCount >= 1 && result.relatedCount <= 3 && result.cartCount === '1' && result.cartOpen);
    const result = { viewport: [viewport.width, viewport.height], scenarios: scenarioResults, persistenceWrites, errors };
    if (!valid || persistenceWrites.length || errors.length) throw new Error(`Homepage topic resource/cart validation failed: ${JSON.stringify(result)}`);
    results.push(result);
    await context.close();
  }
  console.log(JSON.stringify(results));
} finally {
  await browser.close();
}
