// Shared pieces for the release checks: a local stand-in for the Gateway's
// AI route (the runtime's own stand-in refuses every call), and test data.
import { startRuntime, expect } from '/home/user/oss-new/control/runtime/index.mjs';

export { expect };

// Answers /api/ai/default/v1/chat/completions the way an OpenAI-compatible
// model would, deterministically, and records each request at /__requests.
const FAKE_GATEWAY = `const requests = [];
const text = (content) => typeof content === 'string' ? content : content.filter(p => p.type === 'text').map(p => p.text).join('\\n');
const reply = (content) => Response.json({ id: 'chat-1', object: 'chat.completion', choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content } }] });
export default { async fetch(request) {
  const url = new URL(request.url);
  if (url.pathname === '/__requests') return Response.json(requests);
  if (!url.pathname.endsWith('/chat/completions')) {
    return Response.json({ code: 'integration_not_configured', message: 'not here' }, { status: 503, headers: { 'x-everyapp-error': 'integration_not_configured' } });
  }
  const body = await request.json();
  requests.push(body);
  const system = body.messages.filter(m => m.role === 'system').map(m => text(m.content)).join('\\n');
  const last = body.messages[body.messages.length - 1];
  const user = text(last.content);
  if (user.includes('MODEL-DOWN')) return Response.json({ error: { message: 'upstream failed' } }, { status: 502 });
  if (Array.isArray(last.content) && last.content.some(p => p.type === 'image_url')) {
    return reply('A small square of warm orange on a plain background, flat studio lighting, soft shadows, minimal composition, calm mood, crisp detail.');
  }
  if (system.includes('JSON')) {
    if (user.includes('BAD-JSON')) return reply('Sorry, here are my thoughts in prose instead.');
    return reply('\`\`\`json\\n' + JSON.stringify({ score: 58, strengths: ['States the topic clearly'], problems: [{ problem: 'No audience given', impact: 'The answer guesses the reading level, so it often misses.' }, { problem: 'No output format', impact: 'The length and layout vary from run to run.' }], improved: 'You are a patient science teacher. Explain photosynthesis to a 12-year-old in five short bullet points, ending with one everyday example.' }) + '\\n\`\`\`');
  }
  const change = user.match(/Change request: (.*)/);
  if (change) return reply('You are a seasoned travel planner. Revised (' + change[1] + '): plan three days in Lisbon on a mid-range budget, one paragraph per day.');
  const idea = (user.match(/Idea: (.*)/) || [null, user])[1];
  return reply('You are a seasoned travel planner.\\n\\nContext: ' + idea + '\\n\\nTask: Build a day-by-day plan with morning, afternoon and evening suggestions.\\n\\nConstraints: Mid-range budget, walkable routes, no more than three sights a day.\\n\\nOutput format: A heading per day followed by a short bulleted list.');
} };`;

export async function start(options = {}) {
  return startRuntime({
    bindings: { EVERY_APP_GATEWAY: { type: 'worker', worker: 'fake-gateway' } },
    workers: [{ config: { name: 'fake-gateway', compatibilityDate: '2025-06-01', manifest: { mainModule: 'fake.mjs', modules: { 'fake.mjs': { type: 'esm', contents: FAKE_GATEWAY } } } } }],
    ...options,
  });
}

export async function aiRequests(runtime) {
  const worker = await runtime.mf.getWorker('fake-gateway');
  return (await worker.fetch('http://fake/__requests')).json();
}

// A valid 1x1 PNG.
export const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

/** Picks an option in a Base UI select opened from the trigger with `testId`. */
export async function pick(page, testId, option) {
  await page.getByTestId(testId).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

/** Waits for the next server function call while `action` runs, and returns the request. */
export async function captureServerCall(page, action) {
  const [request] = await Promise.all([
    page.waitForRequest((r) => r.url().includes('/_serverFn/') && r.method() === 'POST'),
    action(),
  ]);
  return request;
}

/** Sends a captured server function call again from the page, with `from` replaced by `to` in its body. */
export async function replay(page, request, from, to) {
  const body = request.postData().split(from).join(to);
  const headers = request.headers();
  return page.evaluate(async ({ url, body, headers }) => {
    const response = await fetch(url, { method: 'POST', body, headers });
    return { status: response.status, text: await response.text() };
  }, { url: request.url(), body, headers: { 'content-type': headers['content-type'] ?? 'application/json', accept: headers['accept'] ?? '*/*', 'x-tsr-serverFn': headers['x-tsr-serverfn'] ?? 'true' } });
}
