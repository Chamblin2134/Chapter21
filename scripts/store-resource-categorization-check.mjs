import { chromium } from 'playwright-core';

const baseUrl = 'https://3000-irfx7g2nrndpcpue4mi7t-15166e4a.us4.manus.computer/avery-source.html';
const viewports = [
  { name: 'desktop', width: 1280, height: 720 },
  { name: 'mobile', width: 390, height: 844 },
];

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
    await page.goto(`${baseUrl}?resource-categorization-check=${viewport.name}#store`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => Boolean(window.AveryStoreManagerApi));
    await page.evaluate(() => {
      const originalApi = window.AveryStoreManagerApi;
      const api = {
        ...originalApi,
        isAdmin: () => true,
        getSession: () => ({ user: { id: '__resource_categorization_test__' } }),
        supabase: {
        from: () => ({ select: () => ({ order: async () => ({ data: [], error: null }) }) }),
        storage: { from: () => ({}) },
        },
      };
      window.AveryStoreManagerApi = api;
      const manager = document.getElementById('v14Admin');
      if (manager) { manager.hidden = false; manager.open = true; }
      window.dispatchEvent(new Event('avery:store-manager-api-ready'));
    });
    await page.waitForSelector('#v15UploadInput', { state: 'attached' });

    await page.locator('#v15AutoAssignHigh').check();
    await page.locator('#v15UploadInput').setInputFiles({
      name: '100-Coping-Strategies.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Page >>\nstream\n(Healthy coping skills and grounding practice)\nendstream\nendobj\n%%EOF'),
    });
    await page.waitForFunction(() => document.querySelector('.v15-suggestion')?.textContent?.includes('Coping & Emotional Regulation'));
    const firstDraft = page.locator('[data-v15-draft]').first();
    const highConfidenceText = await firstDraft.locator('.v15-suggestion').textContent();
    const autoCategory = await firstDraft.locator('[data-v15-draft-field="category"]').inputValue();
    const suggestedTitle = await firstDraft.locator('[data-v15-draft-field="title"]').inputValue();
    const suggestedDescription = await firstDraft.locator('[data-v15-draft-field="description"]').inputValue();
    const suggestedTags = await firstDraft.locator('[data-v15-draft-field="topicTags"]').inputValue();
    await page.screenshot({ path: `/home/ubuntu/screenshots/resource-categorization-${viewport.name}-high.png` });

    await page.locator('#v15UploadInput').setInputFiles({
      name: 'Values-Reflection.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Page >>\nstream\n(Values reflection)\nendstream\nendobj\n%%EOF'),
    });
    const secondDraft = page.locator('[data-v15-draft]').nth(1);
    await secondDraft.locator('.v15-suggestion').filter({ hasText: 'Medium confidence' }).waitFor();
    const lowConfidenceText = await secondDraft.locator('.v15-suggestion').textContent();
    const lowCandidateCount = await secondDraft.locator('[data-v15-use-collection]').count();
    await secondDraft.locator('[data-v15-choose-collection]').click();
    const chooseDifferentFocused = await page.evaluate(() => document.activeElement?.getAttribute('data-v15-draft-field'));
    await secondDraft.locator('[data-v15-use-collection]').first().click();
    const manuallyChosenCollection = await secondDraft.locator('[data-v15-draft-field="category"]').inputValue();

    await page.locator('#v15UploadInput').setInputFiles({
      name: 'Creative-Recovery-Collage.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Page >>\nstream\n(Collage reflection)\nendstream\nendobj\n%%EOF'),
    });
    const thirdDraft = page.locator('[data-v15-draft]').nth(2);
    await thirdDraft.locator('[data-v15-create-collection]').click();
    const customCollection = await thirdDraft.locator('[data-v15-draft-field="customCategory"]').inputValue();
    await page.screenshot({ path: `/home/ubuntu/screenshots/resource-categorization-${viewport.name}-no-match.png` });

    const result = {
      viewport: [viewport.width, viewport.height],
      highConfidenceText,
      autoCategory,
      suggestedTitle,
      suggestedDescription,
      suggestedTags,
      lowConfidenceText,
      lowCandidateCount,
      chooseDifferentFocused,
      manuallyChosenCollection,
      customCollection,
      errors,
    };
    if (!highConfidenceText?.includes('High confidence') || !highConfidenceText.includes('Coping & Emotional Regulation') || autoCategory !== 'Coping & Emotional Regulation' || !suggestedTitle || !suggestedDescription || !suggestedTags.includes('Coping') || !lowConfidenceText?.includes('Medium confidence') || lowCandidateCount !== 1 || chooseDifferentFocused !== 'category' || manuallyChosenCollection !== 'Values & Decision-Making' || customCollection !== 'Creative Recovery Collage Resources' || errors.length) {
      throw new Error(`Resource categorization check failed: ${JSON.stringify(result)}`);
    }
    results.push(result);
    await context.close();
  }
  console.log(JSON.stringify(results));
} finally {
  await browser.close();
}
