// Authorization: who may open, read and change what.
import { start, expect, PNG, pick, captureServerCall, replay } from './support.mjs';

const runtime = await start();
try {
  // Anonymous visitors and other organizations are refused everywhere.
  await runtime.assertPrivateAccess(['/', '/check', '/image', '/image-to-prompt', '/library', '/history', '/health']);
  for (const role of [undefined, 'outsider']) {
    const response = await runtime.fetch('/images/anything', { role });
    expect([401, 403]).toContain(response.status);
  }
  // No sign-in of its own.
  for (const path of ['/login', '/signin', '/signup', '/logout', '/register']) {
    const response = await runtime.fetch(path, { role: 'member' });
    expect(response.status).toBe(404);
  }

  const owner = await (await runtime.context('owner')).newPage();
  const member = await (await runtime.context('member')).newPage();
  for (const page of [owner, member]) {
    await page.goto('/');
    await expect(page.locator('input[type="password"]')).toHaveCount(0);
  }

  // The owner makes private history entries and a library prompt.
  await owner.goto('/image-to-prompt');
  await owner.getByTestId('image-file').setInputFiles({ name: 'owner.png', mimeType: 'image/png', buffer: PNG });
  await owner.getByTestId('describe-button').click();
  await expect(owner.getByTestId('result-output')).toBeVisible();
  const thumb = await owner.getByTestId('image-thumb').getAttribute('src');
  await owner.goto('/history');
  await owner.getByTestId('history-item').first().click();
  await expect(owner).toHaveURL(/\/history\/[\w-]+$/);
  const ownerEntryUrl = new URL(owner.url()).pathname;
  const ownerEntryId = ownerEntryUrl.split('/').pop();

  await owner.goto('/library');
  await owner.getByTestId('library-add').click();
  await owner.getByTestId('library-title').fill('Quarterly report outline');
  await pick(owner, 'library-category', 'Business');
  await owner.getByTestId('library-body').fill('Draft an outline for a quarterly business report with five sections.');
  await owner.getByTestId('library-save').click();
  await expect(owner.getByTestId('library-title')).toHaveCount(0);
  await owner.getByTestId('library-search').fill('Quarterly report outline');
  await expect(owner.getByTestId('library-item')).toHaveCount(1);
  const ownerPromptId = await owner.getByTestId('library-item').getAttribute('data-id');

  // Another member cannot see the owner's history or image.
  expect((await runtime.fetch(thumb, { role: 'member' })).status).toBe(404);
  expect((await runtime.fetch(thumb, { role: 'owner' })).status).toBe(200);
  await member.goto('/history');
  await expect(member.getByTestId('history-item')).toHaveCount(0);
  await member.goto(ownerEntryUrl);
  await expect(member.getByTestId('history-missing')).toBeVisible();
  await expect(member.getByTestId('result-output')).toHaveCount(0);

  // The member makes entries of their own, and captures their own calls.
  await member.goto('/check');
  await member.getByTestId('check-input').fill('write a poem');
  await member.getByTestId('check-button').click();
  await expect(member.getByTestId('check-level')).toBeVisible();
  await member.goto('/history');
  await member.getByTestId('history-item').first().click();
  const memberEntryId = new URL(member.url()).pathname.split('/').pop();
  await member.getByTestId('history-delete').click();
  const deleteCall = await captureServerCall(member, () => member.getByRole('button', { name: 'Delete', exact: true }).click());
  await expect(member).toHaveURL(/\/history$/);
  // Replaying the delete with the owner's entry id changes nothing.
  await replay(member, deleteCall, memberEntryId, ownerEntryId);
  await owner.goto(ownerEntryUrl);
  await expect(owner.getByTestId('result-output')).toBeVisible();
  expect((await runtime.fetch(thumb, { role: 'owner' })).status).toBe(200);

  // Library: members see everyone's prompts, but only the author edits.
  await member.goto(`/library?q=${encodeURIComponent('Quarterly report outline')}`);
  await expect(member.getByTestId('library-item')).toHaveCount(1);
  await expect(member.getByTestId('library-edit')).toHaveCount(0);
  await expect(member.getByTestId('library-delete')).toHaveCount(0);
  await member.getByTestId('library-search').fill('');
  await member.getByTestId('library-add').click();
  await member.getByTestId('library-title').fill('Member study helper');
  await pick(member, 'library-category', 'Education');
  await member.getByTestId('library-body').fill('Turn these notes into ten flashcards.');
  await member.getByTestId('library-save').click();
  await expect(member.getByTestId('library-title')).toHaveCount(0);
  await member.getByTestId('library-search').fill('Member study helper');
  await expect(member.getByTestId('library-item')).toHaveCount(1);
  const memberPromptId = await member.getByTestId('library-item').getAttribute('data-id');
  await member.getByTestId('library-edit').click();
  await member.getByTestId('library-title').fill('Member study helper v2');
  const editCall = await captureServerCall(member, () => member.getByTestId('library-save').click());
  await expect(member.getByTestId('library-title')).toHaveCount(0);
  await replay(member, editCall, memberPromptId, ownerPromptId);
  await member.getByTestId('library-search').fill('Member study helper v2');
  await member.getByTestId('library-delete').click();
  const removeCall = await captureServerCall(member, () => member.getByRole('button', { name: 'Delete', exact: true }).click());
  await expect(member.getByTestId('library-item')).toHaveCount(0);
  await replay(member, removeCall, memberPromptId, ownerPromptId);
  await owner.goto(`/library?q=${encodeURIComponent('Quarterly report outline')}`);
  await expect(owner.getByTestId('library-item-title')).toHaveText('Quarterly report outline');

  // An admin may delete another member's prompt but not edit it.
  await member.goto('/library');
  await member.getByTestId('library-add').click();
  await member.getByTestId('library-title').fill('Member cover letter');
  await pick(member, 'library-category', 'Writing');
  await member.getByTestId('library-body').fill('Write a short cover letter for a junior designer role.');
  await member.getByTestId('library-save').click();
  await expect(member.getByTestId('library-title')).toHaveCount(0);
  await owner.goto(`/library?q=${encodeURIComponent('Member cover letter')}`);
  await expect(owner.getByTestId('library-item')).toHaveCount(1);
  await expect(owner.getByTestId('library-edit')).toHaveCount(0);
  await owner.getByTestId('library-delete').click();
  await owner.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(owner.getByTestId('library-item')).toHaveCount(0);
} finally {
  await runtime.close();
}
