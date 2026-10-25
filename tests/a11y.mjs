// axe-core check (desktop + mobile) on every calculator step and the summary screen.
// Usage: node tests/a11y.mjs [baseUrl]
import { chromium } from '/workspace/booking-demo/node_modules/playwright-core/index.mjs';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const axe = readFileSync('/workspace/cms-demo/scripts/node_modules/axe-core/axe.min.js', 'utf8');
const BASE = process.argv[2] || 'http://127.0.0.1:8796/';
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const report = {};
let total = 0;
async function run(page, label) {
  await page.waitForTimeout(400);
  if (!(await page.evaluate(() => !!window.axe))) await page.addScriptTag({ content: axe });
  const r = await page.evaluate((tags) => axe.run(document, { runOnly: tags }), TAGS);
  report[label] = { violations: r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, targets: v.nodes.slice(0, 4).map((n) => n.target.join(' ')) })), passes: r.passes.length };
  total += r.violations.length;
  console.log(`${label}: ${r.violations.length} violations, ${r.passes.length} rules passed`);
  for (const v of report[label].violations) console.log('   -', v.impact, v.id, v.help, v.targets);
}
for (const [name, vp] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
  const ctx = await browser.newContext({ viewport: vp });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.getElementById('calculator').scrollIntoView());
  await run(page, `${name} · page + step 1`);
  await page.click('[data-testid=next]'); await page.click('[data-value=sqft]'); await page.fill('#f-sqft', '50'); await page.click('[data-testid=next]');
  await run(page, `${name} · step 2 (with error)`);
  await page.fill('#f-sqft', '1500'); await page.click('[data-testid=next]');
  await run(page, `${name} · step 3`);
  await page.click('[data-testid=next]'); await page.check('#x-laundry');
  if (name === 'mobile') await page.getByRole('button', { name: /Breakdown/ }).click();
  await run(page, `${name} · step 4${name === 'mobile' ? ' + open breakdown' : ''}`);
  await page.click('[data-testid=next]'); await page.click('[data-testid=next]');
  await run(page, `${name} · step 5 (with errors)`);
  const d = new Date(); d.setDate(d.getDate() + 3);
  await page.fill('#f-date', `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  await page.click('[data-value=midday]'); await page.click('[data-testid=next]'); await page.click('[data-testid=next]');
  await run(page, `${name} · step 6 (with errors)`);
  await page.fill('#f-name', 'Sam Sample'); await page.fill('#f-email', 'sam@example.com'); await page.fill('#f-zip', '12345');
  await page.click('[data-testid=next]'); await page.locator('[data-testid=summary]').waitFor();
  await run(page, `${name} · summary`);
  await page.evaluate(() => { for (const d of document.querySelectorAll('details')) d.open = true; });
  await run(page, `${name} · FAQ open`);
  await ctx.close();
}
mkdirSync(new URL('../reports/', import.meta.url), { recursive: true });
writeFileSync(new URL('../reports/axe-report.json', import.meta.url), JSON.stringify(report, null, 2));
await browser.close();
console.log(total ? `\n${total} violations total` : '\n0 violations');
process.exitCode = total ? 1 : 0;
