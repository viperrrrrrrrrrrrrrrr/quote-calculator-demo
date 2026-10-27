// End-to-end test of the calculator flow (Playwright + system Chrome).
// Expected prices are computed independently here from src/pricing.ts (Node 22 strips TS types).
// Usage: node tests/e2e.mjs [baseUrl]
import { chromium } from '/workspace/booking-demo/node_modules/playwright-core/index.mjs';
import { pricing } from '../src/pricing.ts';

const BASE = process.argv[2] || 'http://127.0.0.1:8796/';
let fails = 0;
const ok = (c, m) => { console.log(c ? 'PASS' : 'FAIL', m); if (!c) fails++; };
const $ = (n) => '$' + n.toLocaleString('en-US');

// ---- independent price model (mirrors the documented rules in pricing.ts) ----
function expected({ service, bedrooms, bathrooms, sqft, frequency = 'once', extras = {}, weekend = false }) {
  const s = pricing.services[service];
  let cleaning = s.base + (sqft ? Math.round(sqft * s.perSqFt) : (bedrooms * s.perBedroom) + Math.round(bathrooms * s.perBathroom));
  const f = s.recurring ? frequency : 'once';
  const disc = Math.round(cleaning * pricing.frequencies[f].discount);
  let ex = 0;
  for (const [id, qty] of Object.entries(extras)) ex += pricing.extras.find((x) => x.id === id).price * qty;
  let total = cleaning - disc + ex + (weekend ? pricing.weekendSurcharge : 0);
  return { total: Math.max(total, pricing.minimumPrice), disc };
}

// ---- dates in the local timezone ----
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function nextDay(pred) { const d = new Date(); d.setHours(12); for (let i = 1; i < 30; i++) { d.setDate(d.getDate() + 1); if (pred(d.getDay())) return iso(d); } }
const SATURDAY = nextDay((g) => g === 6);
const WEEKDAY = nextDay((g) => g >= 1 && g <= 5);

const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });

async function newPage(viewport = { width: 1280, height: 900 }) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  const reqs = [];
  page.on('request', (r) => reqs.push({ method: r.method(), url: r.url(), body: r.postData() || '' }));
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(BASE, { waitUntil: 'networkidle' });
  return { ctx, page, reqs, errors };
}
const total = (page) => page.locator('[data-testid=live-summary] [data-testid=total]').innerText();
const next = (page) => page.click('[data-testid=next]');
const stepIs = (page, id) => page.locator(`[data-step=${id}]`).waitFor({ timeout: 3000 }).then(() => true, () => false);

// ======================= Scenario A: deep clean by sq ft, weekend =======================
{
  const { ctx, page, reqs, errors } = await newPage();
  const T = 'Zed Testperson', E = 'zed.e2e@example.com', Z = '99999', N = 'NOTE-e2e-secret';
  ok((await page.locator('[data-testid=demo-banner]').count()) === 0, 'no top demo banner');
  ok((await page.locator('[data-testid=demo-footer]').innerText()).includes('Website by Ivan Litvin · sample prices'), 'footer credit text');
  ok((await total(page)) === $(expected({ service: 'standard', bedrooms: 2, bathrooms: 1 }).total), 'initial default estimate ' + (await total(page)));

  await page.click('[data-value=deep]');
  ok((await total(page)) === $(expected({ service: 'deep', bedrooms: 2, bathrooms: 1 }).total), 'price updates on service change: ' + (await total(page)));
  await next(page); ok(await stepIs(page, 'size'), 'step 2 reached');
  await page.click('[data-value=sqft]');
  await page.fill('#f-sqft', '100'); await next(page);
  ok(await stepIs(page, 'size') && await page.locator('#f-sqft-error').isVisible(), 'sq ft out of range blocks Next with an error');
  ok(await page.evaluate(() => document.activeElement?.id) === 'f-sqft', 'focus moved to invalid field');
  await page.fill('#f-sqft', '1800');
  ok((await total(page)) === $(expected({ service: 'deep', sqft: 1800 }).total), 'sq ft pricing: ' + (await total(page)));
  await next(page); ok(await stepIs(page, 'frequency'), 'step 3 reached');
  ok(await page.locator('[data-value=weekly]').getAttribute('aria-disabled') === 'true', 'recurring options disabled for deep clean');
  await next(page); ok(await stepIs(page, 'extras'), 'step 4 reached');
  await page.check('#x-oven'); await page.check('#x-laundry');
  await page.getByRole('button', { name: 'More loads' }).click();
  await next(page); ok(await stepIs(page, 'date'), 'step 5 reached');
  await next(page);
  ok(await page.locator('#f-date-error').isVisible() && await page.locator('#f-timeWindow-error').isVisible(), 'date + time window required');
  await page.fill('#f-date', SATURDAY);
  await page.click('[data-value=morning]');
  const expA = expected({ service: 'deep', sqft: 1800, extras: { oven: 1, laundry: 2 }, weekend: true });
  ok((await total(page)) === $(expA.total), `scenario A total ${await total(page)} == ${$(expA.total)} (incl. weekend surcharge)`);
  ok((await page.locator('[data-testid=live-summary] [data-testid=breakdown]').innerText()).includes('Weekend visit'), 'weekend line in breakdown');
  await next(page); ok(await stepIs(page, 'contact'), 'step 6 reached');

  // persistence: reload keeps step + choices, but not contact details
  await page.fill('#f-name', 'Should Not Persist');
  await page.reload({ waitUntil: 'networkidle' });
  ok(await stepIs(page, 'contact'), 'reload restores current step (localStorage)');
  ok((await total(page)) === $(expA.total), 'reload restores choices/price');
  ok((await page.inputValue('#f-name')) === '', 'contact details are not persisted');
  const stored = await page.evaluate(() => localStorage.getItem('quote-demo:v1') || '');
  ok(!/Should Not Persist|name|email/.test(stored), 'localStorage holds no contact fields');

  await next(page);
  ok((await page.locator('[role=status]').first().innerText()).includes('Please fix'), 'empty contact form shows error status');
  await page.fill('#f-name', T); await page.fill('#f-email', 'not-an-email'); await page.fill('#f-zip', Z); await page.fill('#f-notes', N);
  await next(page);
  ok(await page.locator('#f-email-error').isVisible(), 'invalid email rejected');
  await page.fill('#f-email', E);
  const namesAttr = await page.locator('input[name], textarea[name], select[name]').count();
  ok(namesAttr === 0, 'no input/textarea/select has a name attribute');
  ok(await page.locator('form[action]').count() === 0, 'form has no action attribute');
  const before = reqs.length;
  await next(page);
  await page.locator('[data-testid=summary]').waitFor();
  await page.waitForTimeout(800);
  const sum = await page.locator('[data-testid=summary]').innerText();
  ok(/Request not sent/.test(sum), 'summary shows "Request not sent"');
  ok(/Your estimate/.test(sum) && sum.includes($(expA.total)), 'summary "Your estimate" with total ' + $(expA.total));
  ok(/Final price confirmed after a short written brief/.test(sum), 'summary mentions written brief');
  ok((await page.locator('[data-testid=lead-preview]').innerText()).includes(E), 'lead preview shows the request details');
  const after = reqs.slice(before);
  const leak = reqs.filter((r) => [T, E, Z, N, encodeURIComponent(E), 'Zed'].some((v) => (r.url + r.body).includes(v)) || r.method !== 'GET');
  ok(after.length === 0, `no network request on submit (${after.length})`);
  ok(leak.length === 0, `no request carries form data / no non-GET requests (total requests: ${reqs.length})`);
  ok(errors.length === 0, 'no console/page errors ' + errors.join(' | '));
  await page.screenshot({ path: '/tmp/e2e-summary.png', fullPage: false });
  await ctx.close();
}

// ======================= Scenario B: standard weekly, keyboard only =======================
{
  const { ctx, page } = await newPage();
  await page.locator('[data-value=standard]').focus();
  await page.keyboard.press('ArrowDown');
  ok(await page.locator('[data-value=deep]').getAttribute('aria-checked') === 'true', 'arrow keys move selection in radio group');
  await page.keyboard.press('ArrowUp');
  ok(await page.locator('[data-value=standard]').getAttribute('aria-checked') === 'true', 'arrow up returns to standard');
  await page.keyboard.press('Tab'); // -> Next button
  ok(await page.evaluate(() => document.activeElement?.dataset.testid) === 'next', 'Tab reaches Next button');
  await page.keyboard.press('Enter');
  ok(await stepIs(page, 'size'), 'Enter submits step (keyboard)');
  ok(await page.evaluate(() => document.activeElement?.id) === 'step-title', 'focus moves to new step heading');
  await page.getByRole('button', { name: 'More bedrooms' }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'More bathrooms' }).press('Space');
  await next(page);
  await page.locator('[data-value=weekly]').click();
  const expB = expected({ service: 'standard', bedrooms: 3, bathrooms: 2, frequency: 'weekly', extras: { fridge: 1, pets: 1 } });
  await next(page);
  await page.check('#x-fridge'); await page.check('#x-pets');
  ok((await total(page)) === $(expB.total), `scenario B total ${await total(page)} == ${$(expB.total)}`);
  const bd = await page.locator('[data-testid=live-summary] [data-testid=breakdown]').innerText();
  ok(bd.includes('Weekly discount') && bd.includes('−' + $(expB.disc)), `weekly discount line −${$(expB.disc)} shown`);
  await next(page);
  await page.fill('#f-date', WEEKDAY); await page.click('[data-value=afternoon]');
  ok((await total(page)) === $(expB.total), 'weekday adds no surcharge');
  // progress indicator: jump back to step 1 and check per-visit label
  await page.getByRole('button', { name: /Step 1: Service/ }).click();
  ok(await stepIs(page, 'service'), 'progress indicator navigates back');
  ok((await page.locator('[data-testid=live-summary]').innerText()).includes('per visit'), 'recurring shows "per visit"');
  await ctx.close();
}

// ======================= Scenario C: minimum price + mobile bar =======================
{
  const { ctx, page } = await newPage({ width: 390, height: 844 });
  await page.evaluate(() => document.getElementById('calculator').scrollIntoView());
  await page.waitForTimeout(500);
  await next(page);
  await page.getByRole('button', { name: 'Fewer bedrooms' }).click();
  await page.getByRole('button', { name: 'Fewer bedrooms' }).click();
  const expC = expected({ service: 'standard', bedrooms: 0, bathrooms: 1 });
  const bar = page.locator('[data-testid=mobile-bar]');
  ok(await bar.isVisible(), 'mobile bottom bar visible on phone');
  ok((await bar.locator('[data-testid=total]').innerText()) === $(expC.total), `minimum price applied on mobile bar: ${$(expC.total)}`);
  await bar.getByRole('button', { name: /Breakdown/ }).click();
  ok((await bar.innerText()).includes('Minimum visit price'), 'mobile breakdown opens with minimum-price line');
  ok(!(await page.locator('[data-testid=live-summary]').isVisible()), 'desktop sidebar hidden on mobile');
  await ctx.close();
}

await browser.close();
console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
process.exitCode = fails ? 1 : 0;
