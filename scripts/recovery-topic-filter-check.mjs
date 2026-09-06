import { chromium } from 'playwright-core';

const baseUrl = 'https://3000-irfx7g2nrndpcpue4mi7t-15166e4a.us4.manus.computer/avery-source.html';
const viewports = [{ name: 'desktop', width: 1280, height: 720 }, { name: 'mobile', width: 390, height: 844 }];
const browser = await chromium.launch({ headless: true, executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage'] });

try {
  const results = [];
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${baseUrl}?recovery-topic-filter-check=${viewport.name}#store`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => Boolean(window.AveryStoreManagerApi && document.getElementById('v15PublicBrowse')));
    await page.evaluate(() => {
      const api = window.AveryStoreManagerApi;
      const make = (remoteId, title, category, topicTags, description) => ({ remoteId, title, category, topicTags, description, type: 'Worksheet', audience: 'Client', pages: 1, price: '$4.99', priceCents: 499, storagePath: `__${remoteId}__.pdf`, fileName: `${remoteId}.pdf`, thumbnailUrl: null, previewPageUrls: [] });
      window.__recoveryTopicOriginals = structuredClone(api.resourceDb);
      const testCatalog = {
        'Coping Skills': [
          make('__topic_identity__', 'Identity Reflection', 'Coping Skills', ['Identity & Self-Discovery'], 'A guided identity resource.'),
          make('__topic_legacy_coping__', 'Grounding Practice', 'Coping Skills', [], 'A grounding resource.'),
        ],
        'Recovery Planning': [
          make('__topic_relationship__', 'Trust and Boundary Worksheet', 'Recovery Planning', ['Relationships & Boundaries', 'Trust & Repair'], 'Practice rebuilding trust through boundaries.'),
        ],
        'Other': [
          make('__topic_coping__', 'Emotion Regulation Skills', 'Other', ['Coping & Emotional Regulation'], 'Practice coping and emotion regulation.'),
        ],
      };
      Object.keys(api.resourceDb).forEach(key => delete api.resourceDb[key]);
      Object.assign(api.resourceDb, testCatalog);
      window.dispatchEvent(new Event('avery:store-manager-catalog-changed'));
    });
    const ids = () => page.locator('#v15PublicGrid [data-v15-public-resource]').evaluateAll(cards => cards.map(card => card.dataset.v15PublicResource).sort());
    const buttonTopics = () => page.locator('#v15AudienceCollections [data-v15-recovery-topic]').evaluateAll(buttons => buttons.map(button => button.dataset.v15RecoveryTopic));
    const optionTopics = () => page.locator('#v15PublicTopic option').evaluateAll(options => options.map(option => option.value));
    const allBefore = await ids();
    const buttons = await buttonTopics();
    const options = await optionTopics();
    await page.selectOption('#v15PublicTopic', 'Coping & Emotional Regulation');
    const copingTopic = await ids();
    await page.locator('#v15PublicSearch').fill('trust');
    const combinedNoMatch = await ids();
    await page.selectOption('#v15PublicTopic', 'Relationships & Boundaries');
    const combinedTrust = await ids();
    await page.locator('#v15PublicSearch').fill('');
    const relationshipTopic = await ids();
    await page.selectOption('#v15PublicTopic', '');
    await page.locator('#v15PublicSearch').fill('trust');
    const keywordAcrossAll = await ids();
    await page.locator('#v15PublicSearch').fill('Recovery Planning');
    const categoryIsNotKeywordSearch = await ids();
    await page.selectOption('#v15PublicTopic', 'Identity & Self-Discovery');
    await page.locator('#v15PublicSearch').fill('');
    const identityTopic = await ids();
    await page.screenshot({ path: `/home/ubuntu/screenshots/recovery-topic-filter-${viewport.name}.png`, fullPage: false });
    await page.evaluate(() => {
      const api = window.AveryStoreManagerApi;
      Object.keys(api.resourceDb).forEach(key => delete api.resourceDb[key]);
      Object.assign(api.resourceDb, window.__recoveryTopicOriginals);
      delete window.__recoveryTopicOriginals;
      window.dispatchEvent(new Event('avery:store-manager-catalog-changed'));
    });
    const required = ['Identity & Self-Discovery', 'Relationships & Boundaries', 'Coping & Emotional Regulation', 'Triggers, Cravings & Relapse', 'Recovery Maintenance'];
    const pass = JSON.stringify(allBefore) === JSON.stringify(['__topic_coping__', '__topic_identity__', '__topic_legacy_coping__', '__topic_relationship__'])
      && JSON.stringify(copingTopic) === JSON.stringify(['__topic_coping__', '__topic_legacy_coping__'])
      && combinedNoMatch.length === 0
      && JSON.stringify(combinedTrust) === JSON.stringify(['__topic_relationship__'])
      && JSON.stringify(relationshipTopic) === JSON.stringify(['__topic_relationship__'])
      && JSON.stringify(keywordAcrossAll) === JSON.stringify(['__topic_relationship__'])
      && categoryIsNotKeywordSearch.length === 0
      && JSON.stringify(identityTopic) === JSON.stringify(['__topic_identity__'])
      && required.every(topic => buttons.includes(topic) && options.includes(topic))
      && buttons.includes('') && options.includes('') && !buttons.includes('Coping Skills') && !options.includes('Coping Skills')
      && errors.length === 0;
    if (!pass) throw new Error(`Recovery Topic filter check failed: ${JSON.stringify({ viewport, allBefore, buttons, options, copingTopic, combinedNoMatch, combinedTrust, relationshipTopic, keywordAcrossAll, categoryIsNotKeywordSearch, identityTopic, errors })}`);
    results.push({ viewport: [viewport.width, viewport.height], checked: true });
    await context.close();
  }
  console.log(JSON.stringify(results));
} finally {
  await browser.close();
}
