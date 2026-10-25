// Portfolio screenshots: desktop mid-flow, summary, mobile screens (composed on a canvas), animation frames.
// Raw PNGs go to /tmp/qd-shots; scripts/make-images.py turns them into the final JPG/WebP files.
// Usage: node tests/shots.mjs [baseUrl]
import { chromium } from '/workspace/booking-demo/node_modules/playwright-core/index.mjs';
import { mkdirSync, writeFileSync, readdirSync } from 'node:fs';
const BASE = process.argv[2] || 'http://127.0.0.1:8796/';
const RAW = '/tmp/qd-shots';
mkdirSync(RAW, { recursive: true });
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const WEEKDAY = (() => { const d = new Date(); d.setHours(12); d.setDate(d.getDate() + 6); while ([0, 6].includes(d.getDay())) d.setDate(d.getDate() + 1); return iso(d); })();

async function open(viewport, dpr) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: dpr, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: 'html{scroll-behavior:auto!important} *{caret-color:transparent!important}' });
  return { ctx, page };
}
const toCalc = (page, off = 16) => page.evaluate((o) => window.scrollTo(0, document.getElementById('calculator').getBoundingClientRect().top + scrollY - o), off);
const next = (page) => page.click('[data-testid=next]');
const rest = async (page) => { await page.mouse.move(2, 2); await page.evaluate(() => document.activeElement?.blur()); await page.waitForTimeout(500); };

async function toExtras(page) {
  await next(page);
  await page.getByRole('button', { name: 'More bedrooms' }).click();
  await page.getByRole('button', { name: 'More bathrooms' }).click();
  await next(page);
  await page.click('[data-value=biweekly]');
  await next(page);
  await page.check('#x-oven'); await page.check('#x-fridge'); await page.check('#x-pets');
}
async function toSummary(page) {
  await next(page);
  await page.fill('#f-date', WEEKDAY); await page.click('[data-value=morning]');
  await next(page);
  await page.fill('#f-name', 'Alex Sample'); await page.fill('#f-email', 'alex@example.com'); await page.fill('#f-zip', '00000');
  await page.fill('#f-notes', 'Side gate code will be shared in writing.');
  await next(page);
  await page.locator('[data-testid=summary]').waitFor();
}

// ---------- desktop: mid-flow + summary ----------
for (const [w, h] of [[1280, 769], [1024, 768]]) {
  const { ctx, page } = await open({ width: w, height: h }, 2);
  await toCalc(page); await toExtras(page); await toCalc(page); await rest(page);
  await page.screenshot({ path: `${RAW}/midflow-${w}x${h}.png` });
  await toSummary(page); await toCalc(page); await rest(page);
  await page.screenshot({ path: `${RAW}/summary-${w}x${h}.png` });
  await ctx.close();
}

// ---------- mobile screens ----------
{
  const { ctx, page } = await open({ width: 390, height: 844 }, 3);
  await toCalc(page, 0); await page.waitForTimeout(600); await rest(page);
  await page.screenshot({ path: `${RAW}/m1.png` });
  await toExtras(page); await toCalc(page, 0);
  await page.getByRole('button', { name: /Breakdown/ }).click(); await rest(page);
  await page.screenshot({ path: `${RAW}/m2.png` });
  await toSummary(page); await toCalc(page, 0); await rest(page);
  await page.screenshot({ path: `${RAW}/m3.png` });
  await ctx.close();
}

// ---------- compose the mobile canvas (HTML -> screenshot) ----------
const font = readdirSync(new URL('../dist/assets/', import.meta.url)).find((f) => f.startsWith('plus-jakarta-sans-latin-wght'));
const fontUrl = new URL(`../dist/assets/${font}`, import.meta.url).href;
for (const [w, h, phones] of [[1280, 769, ['m1', 'm2', 'm3']], [1024, 768, ['m2', 'm3']]]) {
  const pad = 48, col = 300, gap = 40, pg = 22;
  const pw = Math.floor((w - 2 * pad - col - gap - pg * (phones.length - 1)) / phones.length);
  const ph = Math.min(h - 110, Math.floor((pw - 18) * 844 / 390 + 18));
  const html = `<!doctype html><html><head><style>
  @font-face{font-family:J;src:url(${fontUrl}) format('woff2');font-weight:200 800}
  *{box-sizing:border-box;margin:0}
  body{width:${w}px;height:${h}px;overflow:hidden;font-family:J,sans-serif;color:#0b2233;
    background:radial-gradient(50rem 30rem at 90% 0%,rgba(56,189,248,.28),transparent 60%),radial-gradient(45rem 30rem at 0% 100%,rgba(45,212,191,.30),transparent 60%),#f4faf9;
    display:flex;align-items:center;gap:${gap}px;padding:0 ${pad}px}
  .txt{flex:0 0 ${col}px}
  .tag{display:inline-block;font-size:14px;font-weight:700;color:#115e59;background:#fff;border:1px solid rgba(15,118,110,.2);border-radius:99px;padding:6px 12px}
  h1{font-size:36px;line-height:1.08;letter-spacing:-.02em;font-weight:800;margin-top:18px}
  h1 span{background:linear-gradient(90deg,#0f766e,#0369a1);-webkit-background-clip:text;color:transparent}
  ul{list-style:none;padding:0;margin-top:22px;display:grid;gap:12px;font-size:17px;font-weight:600;color:#334155}
  li{display:flex;gap:10px;align-items:center} li i{width:22px;height:22px;border-radius:50%;background:#0f766e;flex:none;position:relative}
  li i:after{content:'';position:absolute;left:7px;top:4px;width:5px;height:10px;border:solid #fff;border-width:0 2.5px 2.5px 0;transform:rotate(45deg)}
  .note{margin-top:22px;font-size:13px;color:#475569}
  .phones{flex:1;min-width:0;display:flex;justify-content:center;align-items:center;gap:${pg}px}
  .phone{flex:none;height:${ph}px;width:${Math.round((ph - 18) * 390 / 844 + 18)}px;border-radius:34px;background:#0b2233;padding:9px;box-shadow:0 30px 60px -20px rgba(11,34,51,.45)}
  .phone:nth-child(2){transform:translateY(${phones.length === 3 ? -18 : 0}px)}
  .phone img{width:100%;height:100%;border-radius:26px;display:block;object-fit:cover}
  </style></head><body>
  <div class="txt"><span class="tag">Mobile-first · live estimate</span>
  <h1>Instant cleaning estimates <span>on any phone</span></h1>
  <ul><li><i></i>6 short steps with progress</li><li><i></i>Price bar follows the visitor</li><li><i></i>Itemized breakdown + discount</li><li><i></i>Ready-to-quote lead summary</li></ul>
  <p class="note">Demo website by Ivan Litvin · fictional business, sample prices</p></div>
  <div class="phones">${phones.map((p) => `<div class="phone"><img src="file://${RAW}/${p}.png"></div>`).join('')}</div>
  </body></html>`;
  writeFileSync(`${RAW}/compose-${w}.html`, html);
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(`file://${RAW}/compose-${w}.html`); await page.waitForTimeout(800);
  await page.screenshot({ path: `${RAW}/mobile-${w}x${h}.png` });
  await ctx.close();
}

// ---------- animation frames: clicking options, price updates ----------
{
  const { ctx, page } = await open({ width: 1280, height: 769 }, 1);
  await toCalc(page); await rest(page);
  const frames = [];
  let n = 0;
  const snap = async (ms, click) => { const f = `${RAW}/anim-${String(n++).padStart(2, '0')}.png`; await page.screenshot({ path: f }); frames.push({ f, ms, click }); };
  const act = async (locator, fn) => {
    const box = await locator.boundingBox();
    const c = { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) };
    await page.mouse.move(c.x, c.y); await page.waitForTimeout(120);
    await snap(450, { ...c, down: false });
    await fn(); await page.waitForTimeout(450);
    await snap(1000, { ...c, down: true });
  };
  await snap(1200, null);
  await act(page.locator('[data-value=deep]'), () => page.click('[data-value=deep]'));
  await act(page.locator('[data-value=standard]'), () => page.click('[data-value=standard]'));
  await act(page.locator('[data-testid=next]'), () => next(page));
  await toCalc(page);
  await act(page.getByRole('button', { name: 'More bedrooms' }), () => page.getByRole('button', { name: 'More bedrooms' }).click());
  await act(page.getByRole('button', { name: 'More bathrooms' }), () => page.getByRole('button', { name: 'More bathrooms' }).click());
  await act(page.locator('[data-testid=next]'), () => next(page));
  await toCalc(page);
  await act(page.locator('[data-value=weekly]'), () => page.click('[data-value=weekly]'));
  await act(page.locator('[data-testid=next]'), () => next(page));
  await toCalc(page);
  await act(page.locator('label:has(#x-oven)'), () => page.check('#x-oven'));
  await act(page.locator('label:has(#x-windows)'), () => page.check('#x-windows'));
  await act(page.locator('label:has(#x-pets)'), () => page.check('#x-pets'));
  frames[frames.length - 1].ms = 2600;
  writeFileSync(`${RAW}/anim.json`, JSON.stringify(frames, null, 1));
  await ctx.close();
}
await browser.close();
console.log('raw shots in', RAW);
