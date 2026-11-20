// Persistence: records and images survive a restart.
import { start, expect, PNG, pick } from './support.mjs';

const runtime = await start();
try {
  let page = await (await runtime.context('member')).newPage();
  await page.goto('/');
  await page.getByTestId('idea-input').fill('A welcome email for new members of a cycling club');
  await page.getByTestId('generate-button').click();
  await expect(page.getByTestId('result-output')).toBeVisible();
  await page.getByTestId('refine-input').fill('make it friendlier');
  await page.getByTestId('refine-button').click();
  await expect(page.getByTestId('version-item')).toHaveCount(2);

  await page.goto('/image-to-prompt');
  await page.getByTestId('image-file').setInputFiles({ name: 'keep.png', mimeType: 'image/png', buffer: PNG });
  await page.getByTestId('describe-button').click();
  await expect(page.getByTestId('result-output')).toBeVisible();
  const thumb = await page.getByTestId('image-thumb').getAttribute('src');

  await page.goto('/library');
  await page.getByTestId('library-add').click();
  await page.getByTestId('library-title').fill('Club newsletter intro');
  await pick(page, 'library-category', 'Marketing');
  await page.getByTestId('library-body').fill('Write a warm two-line intro for our monthly club newsletter.');
  await page.getByTestId('library-save').click();
  await expect(page.getByTestId('library-title')).toHaveCount(0);
  await expect(page.getByTestId('library-item-title').first()).toHaveText('Club newsletter intro');
  const seeded = await page.getByTestId('library-item').count();

  await runtime.restart();

  page = await (await runtime.context('member')).newPage();
  await page.goto('/history');
  await expect(page.getByTestId('history-item')).toHaveCount(2);
  await pick(page, 'kind-filter', 'Generated');
  await page.getByTestId('history-item').first().click();
  await expect(page.getByTestId('history-input')).toContainText('cycling club');
  await expect(page.getByTestId('version-item')).toHaveCount(2);
  expect((await runtime.fetch(thumb, { role: 'member' })).status).toBe(200);
  await page.goto('/library');
  await expect(page.getByTestId('library-item')).toHaveCount(seeded);
  await page.getByTestId('library-search').fill('Club newsletter intro');
  await expect(page.getByTestId('library-item')).toHaveCount(1);
} finally {
  await runtime.close();
}
