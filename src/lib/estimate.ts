import { pricing, type FrequencyId, type ServiceId } from '../pricing.ts';

/** Everything the visitor enters. Persisted to localStorage (on this device only). */
export interface QuoteData {
  service: ServiceId;
  sizeMode: 'rooms' | 'sqft';
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  frequency: FrequencyId;
  extras: Record<string, number>; // extra id -> quantity (0 / missing = not selected)
  date: string; // YYYY-MM-DD
  timeWindow: string;
  name: string;
  email: string;
  phone: string;
  zip: string;
  notes: string;
}

export const defaultQuote: QuoteData = {
  service: 'standard',
  sizeMode: 'rooms',
  bedrooms: pricing.size.bedrooms.default,
  bathrooms: pricing.size.bathrooms.default,
  sqft: pricing.size.sqft.default,
  frequency: 'once',
  extras: {},
  date: '',
  timeWindow: '',
  name: '',
  email: '',
  phone: '',
  zip: '',
  notes: '',
};

export interface Line {
  label: string;
  detail?: string;
  amount: number;
  kind: 'base' | 'discount' | 'extra' | 'surcharge' | 'adjust';
}

export interface Estimate {
  lines: Line[];
  total: number;
  recurring: boolean;
  discountRate: number;
}

const round = (n: number) => Math.round(n / pricing.roundTo) * pricing.roundTo;

export function isWeekend(date: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return false;
  const day = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getDay();
  return day === 0 || day === 6;
}

/** Effective frequency: services that are not recurring are always one-time. */
export function effectiveFrequency(q: QuoteData): FrequencyId {
  return pricing.services[q.service].recurring ? q.frequency : 'once';
}

export function bedroomLabel(n: number) {
  return n === 0 ? 'Studio' : `${n} bedroom${n === 1 ? '' : 's'}`;
}
export function bathroomLabel(n: number) {
  return `${n} bathroom${n === 1 ? '' : 's'}`;
}

export function calculate(q: QuoteData): Estimate {
  const s = pricing.services[q.service];
  const lines: Line[] = [];

  lines.push({ label: `${s.label}`, detail: 'Base visit', amount: round(s.base), kind: 'base' });
  let cleaning = round(s.base);

  if (q.sizeMode === 'rooms') {
    if (q.bedrooms > 0) {
      const a = round(q.bedrooms * s.perBedroom);
      lines.push({ label: bedroomLabel(q.bedrooms), detail: `${q.bedrooms} × ${money(s.perBedroom)}`, amount: a, kind: 'base' });
      cleaning += a;
    }
    const b = round(q.bathrooms * s.perBathroom);
    lines.push({ label: bathroomLabel(q.bathrooms), detail: `${q.bathrooms} × ${money(s.perBathroom)}`, amount: b, kind: 'base' });
    cleaning += b;
  } else {
    const a = round(q.sqft * s.perSqFt);
    lines.push({ label: `${q.sqft.toLocaleString(pricing.locale)} sq ft`, detail: `× ${money(s.perSqFt, 2)} per sq ft`, amount: a, kind: 'base' });
    cleaning += a;
  }

  const freq = effectiveFrequency(q);
  const rate = pricing.frequencies[freq].discount;

  let extrasTotal = 0;
  const extraLines: Line[] = [];
  for (const e of pricing.extras) {
    const qty = q.extras[e.id] ?? 0;
    if (qty <= 0) continue;
    const a = round(e.price * qty);
    const unit = e.unit ? ` ${e.unit}${qty === 1 ? '' : 's'}` : '';
    extraLines.push({ label: e.label, detail: e.maxQty ? `${qty}${unit} × ${money(e.price)}` : undefined, amount: a, kind: 'extra' });
    extrasTotal += a;
  }

  if (rate > 0) {
    const discountBase = cleaning + (pricing.discountAppliesToExtras ? extrasTotal : 0);
    const d = round(discountBase * rate);
    if (d > 0) lines.push({ label: `${pricing.frequencies[freq].label} discount`, detail: `${Math.round(rate * 100)}% off ${pricing.discountAppliesToExtras ? 'the visit' : 'the cleaning'}`, amount: -d, kind: 'discount' });
  }
  lines.push(...extraLines);

  if (pricing.weekendSurcharge > 0 && isWeekend(q.date)) {
    lines.push({ label: 'Weekend visit', detail: 'Saturday or Sunday', amount: round(pricing.weekendSurcharge), kind: 'surcharge' });
  }

  let total = lines.reduce((sum, l) => sum + l.amount, 0);
  if (total < pricing.minimumPrice) {
    lines.push({ label: 'Minimum visit price', detail: `Visits start at ${money(pricing.minimumPrice)}`, amount: pricing.minimumPrice - total, kind: 'adjust' });
    total = pricing.minimumPrice;
  }

  return { lines, total, recurring: freq !== 'once', discountRate: rate };
}

export function money(n: number, digits = 0) {
  return new Intl.NumberFormat(pricing.locale, {
    style: 'currency',
    currency: pricing.currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);
}

export function signedMoney(n: number) {
  return n < 0 ? `−${money(-n)}` : money(n);
}
