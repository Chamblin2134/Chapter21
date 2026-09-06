import { chromium } from 'playwright-core';

const baseUrl = 'https://3000-irfx7g2nrndpcpue4mi7t-15166e4a.us4.manus.computer/avery-source.html';
const viewports = [
  { name: 'desktop', width: 1280, height: 720 },
  { name: 'mobile', width: 390, height: 844 },
];
const pdf = text => `%PDF-1.4\n1 0 obj\n<< /Type /Page >>\nstream\n(${text})\nendstream\nendobj\n%%EOF`;

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
    await page.goto(`${baseUrl}?secure-intake-drop-check=${viewport.name}#store`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => Boolean(window.AveryStoreManagerApi));
    await page.evaluate(() => {
      const originalApi = window.AveryStoreManagerApi;
      const writes = [];
      const originalFetch = window.fetch;
      window.__secureIntakeWrites = writes;
      window.fetch = async (url, options = {}) => {
        if (String(url) !== '/api/secure-intake/ai-title') return originalFetch(url, options);
        const body = JSON.parse(options.body || '{}');
        const titles = {
          'Grounding-Worksheet.pdf': 'Grounding Skills Practice Worksheet',
          'Craving-Survival-Plan.pdf': 'Craving Survival Plan',
          'Identity-Reflection.pdf': 'Identity Reflection Worksheet',
          'Recovery-Planning.pdf': 'Recovery Planning Workbook',
        };
        await new Promise(resolve => setTimeout(resolve, 160));
        return new Response(JSON.stringify({ title: titles[body.fileName] || 'AI Suggested Resource Title' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      };
      window.AveryStoreManagerApi = {
        ...originalApi,
        isAdmin: () => true,
        getSession: () => ({ access_token: '__secure_intake_drop_test_token__', user: { id: '__secure_intake_drop_test__' } }),
        supabase: {
          from: () => ({
            select: () => ({ order: async () => ({ data: [], error: null }) }),
            insert: () => { writes.push('database insert'); throw new Error('Unexpected database write'); },
            update: () => { writes.push('database update'); throw new Error('Unexpected database write'); },
          }),
          storage: { from: () => ({ upload: () => { writes.push('storage upload'); throw new Error('Unexpected storage write'); } }) },
        },
      };
      const manager = document.getElementById('v14Admin');
      if (manager) { manager.hidden = false; manager.open = true; }
      window.dispatchEvent(new Event('avery:store-manager-api-ready'));
    });
    await page.waitForSelector('#v15DropZone', { state: 'visible' });

    await page.locator('#v15DropInput').setInputFiles({
      name: 'Grounding-Worksheet.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from(pdf('Grounding practice and coping skills')),
    });
    await page.waitForFunction(() => document.querySelector('[data-v15-draft] .v15-draft-progress')?.textContent?.includes('Generating AI title suggestion'));
    await page.waitForFunction(() => document.querySelector('[data-v15-draft] [data-v15-use-ai-title]'));
    await page.waitForFunction(() => document.querySelectorAll('[data-v15-draft]').length === 1 && document.querySelector('[data-v15-draft] .v15-suggestion'));
    await page.locator('[data-v15-use-ai-title]').click();
    await page.waitForFunction(() => document.querySelector('[data-v15-draft] [data-v15-draft-field="title"]')?.value === 'Grounding Skills Practice Worksheet');

    await page.locator('#v15DropZone').evaluate((zone, files) => {
      const transfer = new DataTransfer();
      files.forEach(file => transfer.items.add(new File([file.contents], file.name, { type: 'application/pdf' })));
      zone.dispatchEvent(new DragEvent('dragenter', { bubbles: true, cancelable: true, dataTransfer: transfer }));
      zone.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: transfer }));
      zone.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }));
    }, [
      { name: 'Craving-Survival-Plan.pdf', contents: pdf('cravings, urges and craving management') },
      { name: 'Identity-Reflection.pdf', contents: pdf('who am I without addiction and identity') },
      { name: 'Recovery-Planning.pdf', contents: pdf('recovery planning and relapse prevention') },
    ]);
    await page.waitForFunction(() => document.querySelectorAll('[data-v15-draft]').length === 4 && document.querySelectorAll('[data-v15-draft] .v15-suggestion').length === 4 && document.querySelectorAll('[data-v15-draft] [data-v15-use-ai-title]').length === 4);

    const staged = await page.locator('[data-v15-draft]').evaluateAll(rows => rows.map(row => ({
      details: row.querySelector('.v15-stage-file small')?.textContent || '',
      suggestion: row.querySelector('.v15-suggestion')?.textContent || '',
      aiTitle: row.querySelector('.v15-ai-title strong')?.textContent || '',
      progress: row.querySelector('.v15-draft-progress')?.textContent || '',
    })));
    const uniqueSuggestions = new Set(staged.map(row => row.suggestion)).size;
    await page.screenshot({ path: `/home/ubuntu/screenshots/secure-intake-drop-${viewport.name}.png`, fullPage: true });

    await page.locator('[data-v15-remove-draft]').nth(1).click();
    await page.waitForFunction(() => document.querySelectorAll('[data-v15-draft]').length === 3);
    await page.locator('#v15ClearDrafts').click();
    await page.waitForFunction(() => document.querySelectorAll('[data-v15-draft]').length === 0);
    const writes = await page.evaluate(() => window.__secureIntakeWrites);
    const dropZoneStacked = await page.locator('#v15DropZone').evaluate(zone => {
      const top = zone.parentElement;
      const style = getComputedStyle(top);
      return { columns: style.gridTemplateColumns, zoneWidth: Math.round(zone.getBoundingClientRect().width), parentWidth: Math.round(top.getBoundingClientRect().width) };
    });

    const result = { viewport: [viewport.width, viewport.height], staged, uniqueSuggestions, writes, errors, dropZoneStacked };
    const allShowQueueMetadata = staged.every(row => /\.pdf/i.test(row.details) && row.details.includes('PDF') && /\d+ B/.test(row.details) && row.details.includes('Ready for review') && row.details.includes('1 pages'));
    const topicsAreIndependent = staged.some(row => row.suggestion.includes('Coping Skills')) && staged.some(row => row.suggestion.includes('Triggers, Cravings & Urges')) && staged.some(row => row.suggestion.includes('Identity & Self-Discovery'));
    const aiTitlesAreIndependent = staged.some(row => row.aiTitle.includes('Grounding Skills Practice Worksheet')) && staged.some(row => row.aiTitle.includes('Craving Survival Plan')) && staged.every(row => row.progress.includes('Ready for review'));
    const mobileStacks = viewport.width !== 390 || (dropZoneStacked.zoneWidth >= dropZoneStacked.parentWidth - 2 && dropZoneStacked.columns.split(' ').length === 1);
    if (!allShowQueueMetadata || !topicsAreIndependent || !aiTitlesAreIndependent || uniqueSuggestions < 3 || writes.length || errors.length || !mobileStacks) throw new Error(`Secure Intake drop check failed: ${JSON.stringify(result)}`);
    results.push(result);
    await context.close();
  }
  console.log(JSON.stringify(results));
} finally {
  await browser.close();
}
