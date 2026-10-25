import { pricing } from '../pricing.ts';
import { defaultQuote, type QuoteData } from './estimate.ts';

export const STEPS = [
  { id: 'service', short: 'Service', title: 'What kind of clean do you need?' },
  { id: 'size', short: 'Home size', title: 'How big is your home?' },
  { id: 'frequency', short: 'Frequency', title: 'How often should we come?' },
  { id: 'extras', short: 'Extras', title: 'Any extras?' },
  { id: 'date', short: 'Date & time', title: 'When would you like the visit?' },
  { id: 'contact', short: 'Contact', title: 'Where should the estimate go?' },
] as const;

export type Errors = Partial<Record<keyof QuoteData, string>>;

/** Local YYYY-MM-DD for today + n days. */
export function isoDaysFromToday(n: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + n);
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function formatDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return '';
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString(pricing.locale, {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateStep(step: number, q: QuoteData): Errors {
  const e: Errors = {};
  if (step === 1 && q.sizeMode === 'sqft') {
    const { min, max } = pricing.size.sqft;
    if (!Number.isFinite(q.sqft) || q.sqft < min || q.sqft > max) e.sqft = `Enter a size between ${min.toLocaleString()} and ${max.toLocaleString()} sq ft.`;
  }
  if (step === 4) {
    const min = isoDaysFromToday(pricing.booking.minDaysAhead);
    const max = isoDaysFromToday(pricing.booking.maxDaysAhead);
    if (!q.date) e.date = 'Choose a preferred date.';
    else if (q.date < min || q.date > max) e.date = `Choose a date between ${formatDate(min)} and ${formatDate(max)}.`;
    if (!q.timeWindow) e.timeWindow = 'Choose an arrival window.';
  }
  if (step === 5) {
    if (q.name.trim().length < 2) e.name = 'Enter your name.';
    if (!EMAIL.test(q.email.trim())) e.email = 'Enter a valid email, like name@example.com.';
    if (q.phone.trim() && !/^[+()\d\s.-]{7,20}$/.test(q.phone.trim())) e.phone = 'Use digits, spaces, +, ( ) or - only.';
    if (!/^[A-Za-z0-9][A-Za-z0-9 -]{2,9}$/.test(q.zip.trim())) e.zip = 'Enter your ZIP or postal code.';
    if (q.notes.length > 500) e.notes = 'Keep notes under 500 characters.';
  }
  return e;
}

/* ---------- localStorage (quote choices only — contact details are never stored) ---------- */

const KEY = 'quote-demo:v1';
const CONTACT: (keyof QuoteData)[] = ['name', 'email', 'phone', 'zip', 'notes'];

export interface Saved { step: number; maxStep: number; data: QuoteData }

export function load(): Saved | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Partial<Saved>;
    const d = { ...defaultQuote, ...(s.data ?? {}) } as QuoteData;
    if (!(d.service in pricing.services)) d.service = defaultQuote.service;
    if (!(d.frequency in pricing.frequencies)) d.frequency = defaultQuote.frequency;
    if (d.sizeMode !== 'rooms' && d.sizeMode !== 'sqft') d.sizeMode = 'rooms';
    const clamp = (n: unknown, lo: number, hi: number, def: number) => (typeof n === 'number' && n >= lo && n <= hi ? Math.round(n) : def);
    const sz = pricing.size;
    d.bedrooms = clamp(d.bedrooms, sz.bedrooms.min, sz.bedrooms.max, sz.bedrooms.default);
    d.bathrooms = clamp(d.bathrooms, sz.bathrooms.min, sz.bathrooms.max, sz.bathrooms.default);
    if (typeof d.sqft !== 'number') d.sqft = sz.sqft.default;
    const extras: Record<string, number> = {};
    for (const x of pricing.extras) {
      const v = (d.extras ?? {})[x.id];
      if (typeof v === 'number' && v > 0) extras[x.id] = Math.min(v, x.maxQty ?? 1);
    }
    d.extras = extras;
    if (typeof d.date !== 'string') d.date = '';
    if (!pricing.timeWindows.some((t) => t.id === d.timeWindow)) d.timeWindow = '';
    for (const k of CONTACT) (d as unknown as Record<string, string>)[k] = '';
    const step = clamp(s.step, 0, STEPS.length - 1, 0);
    return { step, maxStep: Math.max(step, clamp(s.maxStep, 0, STEPS.length - 1, 0)), data: d };
  } catch {
    return null;
  }
}

export function save(s: Saved) {
  try {
    const data = { ...s.data };
    for (const k of CONTACT) delete (data as Partial<QuoteData>)[k];
    localStorage.setItem(KEY, JSON.stringify({ ...s, data }));
  } catch {
    /* storage unavailable — ignore */
  }
}

export function clearSaved() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
