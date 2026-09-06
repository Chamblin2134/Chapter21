import { chromium } from 'playwright-core';

const baseUrl = 'https://3000-irfx7g2nrndpcpue4mi7t-15166e4a.us4.manus.computer/avery-source.html';
const viewports = [{ name: 'desktop', width: 1280, height: 720 }, { name: 'mobile', width: 390, height: 844 }];
const validationIds = ['__dual_audience_client__', '__dual_audience_clinician__', '__dual_audience_shared__'];
const browser = await chromium.launch({ headless: true, executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage'] });

try {
  const results = [];
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${baseUrl}?dual-audience-store-check=${viewport.name}#store`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => Boolean(window.AveryStoreManagerApi && document.getElementById('v15PublicBrowse')));
    await page.evaluate(() => {
      const api = window.AveryStoreManagerApi;
      const make = (remoteId, title, category, topicTags, type, audience, description) => ({ remoteId, title, category, topicTags, type, audience, description, pages: 1, price: '$0.00', priceCents: 0, storagePath: `__${remoteId}__.pdf`, fileName: `${remoteId}.pdf`, thumbnailUrl: null, previewPageUrls: [], seriesName: null, subtitle: null });
      window.__dualAudienceOriginals = structuredClone(api.resourceDb);
      const testCatalog = {
        'Coping & Emotional Regulation': [make('__dual_audience_client__', 'Personal Coping Worksheet', 'Coping & Emotional Regulation', ['Coping & Emotional Regulation'], 'Worksheet', 'Client', 'Self-guided coping practice for recovery.')],
        'Trauma & Healing': [make('__dual_audience_clinician__', 'Facilitator Trauma Group Resource', 'Trauma & Healing', ['Trauma & Healing'], 'Group Resource', 'Clinician', 'Professional facilitator material for a recovery group.')],
        'Identity & Self-Discovery': [make('__dual_audience_shared__', 'Identity Reflection Workbook', 'Identity & Self-Discovery', ['Identity & Self-Discovery'], 'Workbook', 'Client + Clinician', 'A recovery workbook for individual and clinical use.')],
      };
      Object.keys(api.resourceDb).forEach(key => delete api.resourceDb[key]);
      Object.assign(api.resourceDb, testCatalog);
      window.dispatchEvent(new Event('avery:store-manager-catalog-changed'));
    });
    const cardIds = async () => page.locator('#v15PublicGrid [data-v15-public-resource]').evaluateAll(cards => cards.map(card => card.dataset.v15PublicResource).sort());
    const recoveryTopics = async () => page.locator('#v15AudienceCollections [data-v15-recovery-topic]').evaluateAll(buttons => buttons.map(button => button.dataset.v15RecoveryTopic));
    await page.locator('[data-v15-shop="Client"]').click();
    const clientCards = await cardIds();
    await page.locator('[data-v15-recovery-topic="Coping & Emotional Regulation"]').click();
    const clientTopicCards = await cardIds();
    await page.locator('[data-v15-shop="Clinician"]').click();
    const clinicianCards = await cardIds();
    await page.locator('[data-v15-recovery-topic="Trauma & Healing"]').click();
    const clinicianTopicCards = await cardIds();
    await page.locator('[data-v15-shop=""]').click();
    const allCards = await cardIds();
    await page.selectOption('#v15PublicTopic', 'Identity & Self-Discovery');
    const topicCards = await cardIds();
    await page.selectOption('#v15PublicTopic', '');
    await page.selectOption('#v15PublicType', 'Group Resource');
    const typeCards = await cardIds();
    await page.selectOption('#v15PublicType', '');
    await page.locator('#v15PublicSearch').fill('facilitator');
    const keywordCards = await cardIds();
    const topicOptions = await page.locator('#v15PublicTopic option').evaluateAll(options => options.map(option => option.value));
    const topicButtons = await recoveryTopics();
    const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    await page.screenshot({ path: `/home/ubuntu/screenshots/dual-audience-store-${viewport.name}.png`, fullPage: false });
    await page.evaluate(() => {
      const api = window.AveryStoreManagerApi;
      Object.keys(api.resourceDb).forEach(key => delete api.resourceDb[key]);
      Object.assign(api.resourceDb, window.__dualAudienceOriginals);
      delete window.__dualAudienceOriginals;
      window.dispatchEvent(new Event('avery:store-manager-catalog-changed'));
    });
    const ordered = values => [...values].sort();
    const requiredTopics = ['Identity & Self-Discovery', 'Coping & Emotional Regulation', 'Trauma & Healing', 'Recovery Maintenance'];
    const result = { viewport: [viewport.width, viewport.height], clientCards, clientTopicCards, clinicianCards, clinicianTopicCards, allCards, topicCards, typeCards, keywordCards, topicOptions, topicButtons, noOverflow, errors };
    if (JSON.stringify(ordered(clientCards)) !== JSON.stringify(ordered(['__dual_audience_client__', '__dual_audience_shared__'])) || JSON.stringify(clientTopicCards) !== JSON.stringify(['__dual_audience_client__']) || JSON.stringify(ordered(clinicianCards)) !== JSON.stringify(ordered(['__dual_audience_clinician__', '__dual_audience_shared__'])) || JSON.stringify(clinicianTopicCards) !== JSON.stringify(['__dual_audience_clinician__']) || JSON.stringify(ordered(allCards)) !== JSON.stringify(ordered(validationIds)) || JSON.stringify(topicCards) !== JSON.stringify(['__dual_audience_shared__']) || JSON.stringify(typeCards) !== JSON.stringify(['__dual_audience_clinician__']) || JSON.stringify(keywordCards) !== JSON.stringify(['__dual_audience_clinician__']) || !requiredTopics.every(topic => topicOptions.includes(topic) && topicButtons.includes(topic)) || !topicOptions.includes('') || !topicButtons.includes('') || topicOptions.includes('Coping Skills') || topicButtons.includes('Coping Skills') || !noOverflow || errors.length) {
      throw new Error(`Dual-audience Store check failed: ${JSON.stringify(result)}`);
    }
    results.push(result);
    await context.close();
  }
  console.log(JSON.stringify(results));
} finally { await browser.close(); }
