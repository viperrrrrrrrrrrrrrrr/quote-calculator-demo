/**
 * ============================================================================
 *  PRICING CONFIG — the one file a business owner edits to set real prices.
 * ============================================================================
 *
 *  Every price and pricing rule used by the calculator lives here.
 *  The values below are SAMPLE prices for a FICTIONAL demo business
 *  ("Mintleaf Home Cleaning"). A real business replaces them with its own.
 *
 *  How the estimate is calculated (see src/lib/estimate.ts — no numbers there):
 *
 *    1. Cleaning price
 *         Rooms mode:   service.base + bedrooms × service.perBedroom
 *                                    + bathrooms × service.perBathroom
 *         Size mode:    service.base + squareFeet × service.perSqFt
 *    2. Frequency discount  = cleaning price × frequency.discount
 *         (also applied to extras only if discountAppliesToExtras = true)
 *    3. Extras              = extra.price × quantity (quantity is 1 unless
 *                             the extra has maxQty, e.g. laundry loads)
 *    4. Weekend surcharge   = weekendSurcharge, if the chosen date is Sat/Sun
 *    5. Minimum visit price = if the total is below minimumPrice, it is
 *                             raised to minimumPrice (shown as its own line)
 *
 *  Every line is rounded to whole currency units (roundTo = 1).
 *  Change a number, rebuild (npm run build), redeploy — that's it.
 * ============================================================================
 */

/** Shape of one add-on in `extras` below. */
export interface Extra {
  id: string;
  label: string;
  price: number;
  /** Turns the extra into a counter, e.g. 'load' -> "2 loads × $20". */
  unit?: string;
  /** Maximum quantity for counter extras (omit for simple on/off extras). */
  maxQty?: number;
  /** Short helper text shown under the label. */
  hint?: string;
}

export const pricing = {
  /** Currency shown on the site (ISO code + locale for formatting). */
  currency: 'USD',
  locale: 'en-US',

  /** Round each breakdown line to this step (1 = whole dollars). */
  roundTo: 1,

  /** No visit is priced below this (after discounts, extras and surcharges). */
  minimumPrice: 120,

  /** Service types. `recurring: false` = always booked as a one-time visit. */
  services: {
    standard: {
      label: 'Standard clean',
      description: 'Regular upkeep: dusting, floors, kitchen and bathroom surfaces.',
      base: 80,
      perBedroom: 20,
      perBathroom: 25,
      perSqFt: 0.09,
      recurring: true,
    },
    deep: {
      label: 'Deep clean',
      description: 'Top-to-bottom detail work: baseboards, grout, fixtures, behind appliances.',
      base: 140,
      perBedroom: 30,
      perBathroom: 35,
      perSqFt: 0.15,
      recurring: false,
    },
    move: {
      label: 'Move-in / move-out',
      description: 'Empty-home clean before you move in or after you move out.',
      base: 170,
      perBedroom: 35,
      perBathroom: 40,
      perSqFt: 0.17,
      recurring: false,
    },
  },

  /** Home size inputs: by rooms, or by approximate square footage. */
  size: {
    bedrooms: { min: 0, max: 6, default: 2 }, // 0 = studio
    bathrooms: { min: 1, max: 5, default: 1 },
    sqft: { min: 400, max: 6000, step: 50, default: 1200 },
  },

  /** Visit frequency and its discount (0.15 = 15% off the cleaning price). */
  frequencies: {
    once: { label: 'One-time', discount: 0 },
    monthly: { label: 'Monthly', discount: 0.1 },
    biweekly: { label: 'Every 2 weeks', discount: 0.15 },
    weekly: { label: 'Weekly', discount: 0.2 },
  },

  /** If true, the frequency discount also applies to extras. */
  discountAppliesToExtras: false,

  /** Add-ons. `maxQty` turns an extra into a counter (price × quantity). */
  extras: [
    { id: 'oven', label: 'Inside oven', price: 30 },
    { id: 'fridge', label: 'Inside fridge', price: 30 },
    { id: 'windows', label: 'Interior windows', price: 40 },
    { id: 'cabinets', label: 'Inside kitchen cabinets', price: 35 },
    { id: 'laundry', label: 'Laundry, wash & fold', price: 20, unit: 'load', maxQty: 4 },
    { id: 'pets', label: 'Pets in the home', price: 15, hint: 'Extra time for pet hair' },
    { id: 'balcony', label: 'Balcony or patio sweep', price: 20 },
  ] as Extra[],

  /** Arrival windows offered in the date step. */
  timeWindows: [
    { id: 'morning', label: 'Morning', hours: '8–11 am' },
    { id: 'midday', label: 'Midday', hours: '11 am–2 pm' },
    { id: 'afternoon', label: 'Afternoon', hours: '2–5 pm' },
  ],

  /** Flat add-on for Saturday / Sunday visits (0 to disable). */
  weekendSurcharge: 20,

  /** How far ahead a date can be picked (in days from today). */
  booking: { minDaysAhead: 1, maxDaysAhead: 60 },
};

export type Pricing = typeof pricing;
export type ServiceId = keyof Pricing['services'];
export type FrequencyId = keyof Pricing['frequencies'];
export type ExtraId = Pricing['extras'][number]['id'];
export type TimeWindowId = Pricing['timeWindows'][number]['id'];
