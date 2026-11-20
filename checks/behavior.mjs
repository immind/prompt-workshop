// Behavior: each feature's main path, as a member sees it.
import { start, expect, aiRequests, PNG, pick, captureServerCall, replay } from './support.mjs';

const runtime = await start();
try {
  // Server routes answer members.
  const health = await runtime.fetch('/health', { role: 'member' });
  expect(health.status).toBe(200);

  const page = await (await runtime.context('member')).newPage();

  // F005: the library starts with prompts written for the app.
  await page.goto('/library');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Library');
  expect(await page.getByTestId('library-item').count()).toBeGreaterThanOrEqual(4);

  // F001: field errors.
  await page.goto('/');
  await expect(page.getByTestId('idea-counter')).toHaveText('0/500');
  await page.getByTestId('generate-button').click();
  await expect(page.getByTestId('idea-error')).toBeVisible();
  await page.getByTestId('idea-input').fill('x'.repeat(501));
  await expect(page.getByTestId('idea-counter')).toHaveText('501/500');
  await page.getByTestId('generate-button').click();
  await expect(page.getByTestId('idea-error')).toBeVisible();
  await expect(page.getByTestId('result-output')).toHaveCount(0);

  // F001: a model failure shows an error and saves nothing.
  await page.getByTestId('idea-input').fill('MODEL-DOWN please');
  await page.getByTestId('generate-button').click();
  await expect(page.getByTestId('ai-error')).toBeVisible();
  await expect(page.getByTestId('result-output')).toHaveCount(0);

  // F001: generate in Advanced mode for Claude, then refine.
  const idea = 'A three-day trip to Lisbon for two friends who love food and old neighbourhoods';
  await page.getByTestId('idea-input').fill(idea);
  await expect(page.getByTestId('idea-counter')).toHaveText(`${idea.length}/500`);
  await page.getByRole('button', { name: 'Advanced', exact: true }).click();
  await page.getByRole('button', { name: 'Claude', exact: true }).click();
  await page.getByTestId('generate-button').click();
  await expect(page.getByTestId('result-output')).toContainText('Lisbon');
  let sent = (await aiRequests(runtime)).at(-1);
  const system = sent.messages.find((m) => m.role === 'system').content;
  expect(system).toContain('Claude');
  expect(system.toLowerCase()).toContain('output format');
  await page.getByTestId('refine-input').fill('make it shorter');
  await page.getByTestId('refine-button').click();
  await expect(page.getByTestId('result-output')).toContainText('make it shorter');
  await expect(page.getByTestId('version-item')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Copy', exact: true }).first()).toBeVisible();

  // F001 -> F005: save the result to the library.
  await page.getByTestId('save-to-library').click();
  await page.getByTestId('library-title').fill('Lisbon food weekend planner');
  await pick(page, 'library-category', 'Other');
  await page.getByTestId('library-save').click();
  await expect(page.getByTestId('library-title')).toHaveCount(0);

  // F002: checker with structured result, and an unparseable answer.
  await page.goto('/check');
  await page.getByTestId('check-input').fill('explain photosynthesis');
  await page.getByTestId('check-button').click();
  await expect(page.getByTestId('check-level')).toHaveText('Fair');
  await expect(page.getByTestId('check-score')).toContainText('58');
  await expect(page.getByTestId('check-strength')).toHaveCount(1);
  await expect(page.getByTestId('check-problem')).toHaveCount(2);
  await expect(page.getByTestId('check-problem').first()).toContainText('guesses the reading level');
  await expect(page.getByTestId('result-output')).toContainText('patient science teacher');
  await page.getByTestId('check-input').fill('BAD-JSON prompt');
  await page.getByTestId('check-button').click();
  await expect(page.getByTestId('ai-error')).toBeVisible();

  // F003: image prompt builder; an option outside the lists is refused.
  await page.goto('/image');
  await page.getByTestId('image-input').fill('A lighthouse on a cliff during a storm');
  await page.getByRole('button', { name: 'Cinematic', exact: true }).click();
  await page.getByRole('button', { name: '16:9', exact: true }).click();
  await pick(page, 'camera-select', 'Low angle');
  await pick(page, 'lighting-select', 'Golden hour');
  await page.getByRole('checkbox', { name: 'Highly detailed' }).click();
  await page.getByTestId('negative-input').fill('blurry, watermark');
  const build = await captureServerCall(page, () => page.getByTestId('image-button').click());
  await expect(page.getByTestId('result-output')).toContainText('lighthouse');
  await expect(page.getByTestId('result-output')).toContainText('Cinematic');
  await expect(page.getByTestId('result-output')).toContainText('16:9');
  await expect(page.getByTestId('negative-output')).toHaveText('blurry, watermark');
  const before = (await aiRequests(runtime)).length;
  const forged = await replay(page, build, 'Cinematic', 'Vaporwave');
  expect(forged.text).not.toContain('lighthouse');
  expect((await aiRequests(runtime)).length).toBe(before);

  // F004: image to prompt, with type checks.
  await page.goto('/image-to-prompt');
  await page.getByTestId('image-file').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') });
  await expect(page.getByTestId('file-error')).toBeVisible();
  await page.getByTestId('image-file').setInputFiles({ name: 'swatch.png', mimeType: 'image/png', buffer: PNG });
  await page.getByTestId('describe-button').click();
  await expect(page.getByTestId('result-output')).toContainText('warm orange');
  await expect(page.getByTestId('image-thumb')).toBeVisible();
  const thumb = await page.getByTestId('image-thumb').getAttribute('src');
  expect(thumb).toMatch(/^\/images\//);
  const image = await runtime.fetch(thumb, { role: 'member' });
  expect(image.status).toBe(200);
  expect(image.headers.get('content-type')).toBe('image/png');

  // F006: history, newest first, filter and detail.
  await page.goto('/history');
  await expect(page.getByTestId('history-item')).toHaveCount(4);
  await expect(page.getByTestId('history-item').first()).toContainText('Image to prompt');
  await pick(page, 'kind-filter', 'Checks');
  await expect(page.getByTestId('history-item')).toHaveCount(1);
  await pick(page, 'kind-filter', 'Generated');
  await expect(page.getByTestId('history-item')).toHaveCount(1);
  await page.getByTestId('history-item').first().click();
  await expect(page.getByTestId('history-input')).toContainText('Lisbon');
  await expect(page.getByTestId('version-item')).toHaveCount(2);
  await runtime.assertBackLink(page);

  // F006: delete an image-to-prompt entry; its image goes too.
  await page.goto('/history');
  await pick(page, 'kind-filter', 'Image to prompt');
  await page.getByTestId('history-item').first().click();
  await page.getByTestId('history-delete').click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page).toHaveURL(/\/history$/);
  expect((await runtime.fetch(thumb, { role: 'member' })).status).toBe(404);

  // F005: browse, filter, search, edit own, delete own.
  await page.goto('/library');
  await pick(page, 'category-filter', 'Coding');
  await expect(page.getByTestId('library-item-category')).toHaveText(['Coding']);
  await pick(page, 'category-filter', 'All');
  await page.getByTestId('library-search').fill('Lisbon');
  await expect(page.getByTestId('library-item')).toHaveCount(1);
  await page.getByTestId('library-edit').click();
  await page.getByTestId('library-title').fill('Lisbon long weekend planner');
  await page.getByTestId('library-save').click();
  await expect(page.getByTestId('library-title')).toHaveCount(0);
  await expect(page.getByTestId('library-item-title')).toHaveText('Lisbon long weekend planner');
  await page.getByTestId('library-search').fill('');
  await page.getByTestId('library-add').click();
  await page.getByTestId('library-title').fill('Draft to remove');
  await pick(page, 'library-category', 'Writing');
  await page.getByTestId('library-body').fill('Rewrite this paragraph in plain English.');
  await page.getByTestId('library-save').click();
  await expect(page.getByTestId('library-title')).toHaveCount(0);
  await page.getByTestId('library-search').fill('Draft to remove');
  await expect(page.getByTestId('library-item')).toHaveCount(1);
  await page.getByTestId('library-delete').click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByTestId('library-item')).toHaveCount(0);

  // Journey end: a generated, refined prompt on screen.
  await page.goto('/');
  await page.getByTestId('idea-input').fill('A weekend food tour of Lisbon for two friends, with old neighbourhoods and local markets');
  await page.getByRole('button', { name: 'Expert', exact: true }).click();
  await page.getByTestId('generate-button').click();
  await expect(page.getByTestId('result-output')).toContainText('Lisbon');
  await runtime.assertBackLink(page);
  await runtime.screenshot(page);

  // Phone-sized smoke.
  const phone = await (await runtime.context('member', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
  await phone.goto('/');
  await expect(phone.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(phone.getByTestId('generate-button')).toBeVisible();
  const overflow = await phone.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  await phone.goto('/image');
  await expect(phone.getByTestId('image-button')).toBeVisible();
  expect(await phone.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
} finally {
  await runtime.close();
}
