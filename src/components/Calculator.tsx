import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  ArrowLeft, ArrowRight, BedDouble, Building2, CalendarDays, Check, ChevronUp, CircleAlert, Home,
  Inbox, Info, Mail, Pencil, Repeat, RotateCcw, Ruler, Sparkles, Sun, Sunrise, Sunset, Truck, SprayCan,
} from 'lucide-react';
import { pricing, type FrequencyId, type ServiceId } from '../pricing.ts';
import {
  bathroomLabel, bedroomLabel, calculate, defaultQuote, effectiveFrequency, isWeekend, money, signedMoney,
  type Estimate, type QuoteData,
} from '../lib/estimate.ts';
import { STEPS, clearSaved, formatDate, isoDaysFromToday, load, save, validateStep, type Errors } from '../lib/form.ts';
import { Field, RadioCards, Stepper, describedBy, inputCls } from './ui.tsx';

const serviceIcons: Record<ServiceId, React.ReactNode> = {
  standard: <SprayCan className="size-5" />,
  deep: <Sparkles className="size-5" />,
  move: <Truck className="size-5" />,
};
const windowIcons = [<Sunrise className="size-5" key="a" />, <Sun className="size-5" key="b" />, <Sunset className="size-5" key="c" />];

export default function Calculator() {
  const [q, setQ] = useState<QuoteData>(defaultQuote);
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const moveFocus = useRef(false);

  // Restore choices after hydration (keeps server HTML and first client render identical).
  useEffect(() => {
    const s = load();
    if (s) { setQ(s.data); setStep(s.step); setMaxStep(s.maxStep); }
    setHydrated(true);
  }, []);
  useEffect(() => { if (hydrated) save({ step, maxStep, data: q }); }, [q, step, maxStep, hydrated]);
  useEffect(() => {
    if (moveFocus.current) { headingRef.current?.focus({ preventScroll: false }); moveFocus.current = false; }
  }, [step, submitted]);

  const est = useMemo(() => calculate(q), [q]);
  const set = <K extends keyof QuoteData>(k: K, v: QuoteData[K]) => {
    setQ((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const go = (n: number) => {
    moveFocus.current = true;
    setErrors({}); setStatus('');
    setStep(n); setMaxStep((m) => Math.max(m, n));
    const top = document.getElementById('calculator');
    if (top && top.getBoundingClientRect().top < 0) top.scrollIntoView({ block: 'start' });
  };

  const check = () => {
    const e = validateStep(step, q);
    const keys = Object.keys(e) as (keyof QuoteData)[];
    setErrors(e);
    if (keys.length) {
      setStatus(`Please fix ${keys.length} ${keys.length === 1 ? 'field' : 'fields'} to continue.`);
      requestAnimationFrame(() => document.getElementById(`f-${keys[0]}`)?.focus());
      return false;
    }
    setStatus('');
    return true;
  };

  const onSubmit = (ev: FormEvent) => {
    ev.preventDefault(); // DEMO: nothing is sent anywhere.
    if (!check()) return;
    if (step < STEPS.length - 1) { go(step + 1); return; }
    moveFocus.current = true;
    setSubmitted(true);
    document.getElementById('calculator')?.scrollIntoView({ block: 'start' });
  };

  const restart = () => {
    clearSaved();
    moveFocus.current = true;
    setQ(defaultQuote); setStep(0); setMaxStep(0); setErrors({}); setStatus(''); setSubmitted(false);
  };

  const err = (k: keyof QuoteData) => errors[k];
  const s = STEPS[step];

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] xl:gap-8">
      <div className="rounded-3xl border border-slate-200/80 bg-white/95 shadow-[0_20px_60px_-25px_rgba(11,34,51,0.25)]">
        {submitted ? (
          <SummaryScreen q={q} est={est} headingRef={headingRef} onEdit={() => { moveFocus.current = true; setSubmitted(false); setStep(STEPS.length - 1); }} onRestart={restart} />
        ) : (
          <form noValidate onSubmit={onSubmit} aria-labelledby="step-title" data-testid="quote-form">
            <Progress step={step} maxStep={maxStep} onGo={(n) => go(n)} />
            <div className="px-5 pb-6 pt-5 sm:px-8 sm:pb-8">
              <p className="text-sm font-semibold uppercase tracking-wider text-teal-800">Step {step + 1} of {STEPS.length}</p>
              <h3 id="step-title" ref={headingRef} tabIndex={-1} className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-[1.7rem]">{s.title}</h3>

              <div className="mt-6" data-step={s.id}>
                {step === 0 && (
                  <>
                    <p id="svc-label" className="sr-only">Service type</p>
                    <RadioCards<ServiceId>
                      id="f-service"
                      labelledBy="svc-label"
                      cols="grid-cols-1"
                      value={q.service}
                      onChange={(v) => set('service', v)}
                      options={(Object.keys(pricing.services) as ServiceId[]).map((id) => ({
                        value: id,
                        label: pricing.services[id].label,
                        description: pricing.services[id].description,
                        meta: `from ${money(pricing.services[id].base)}`,
                        icon: serviceIcons[id],
                      }))}
                    />
                  </>
                )}

                {step === 1 && (
                  <div className="space-y-5">
                    <p id="mode-label" className="font-semibold text-ink">Measure by</p>
                    <RadioCards<'rooms' | 'sqft'>
                      labelledBy="mode-label"
                      cols="grid-cols-2"
                      compact
                      value={q.sizeMode}
                      onChange={(v) => set('sizeMode', v)}
                      options={[
                        { value: 'rooms', label: 'Rooms', icon: <BedDouble className="size-5" /> },
                        { value: 'sqft', label: 'Square feet', icon: <Ruler className="size-5" /> },
                      ]}
                    />
                    {q.sizeMode === 'rooms' ? (
                      <div className="grid gap-3">
                        <Stepper id="f-bedrooms" label="Bedrooms" noun="bedrooms" value={q.bedrooms} min={pricing.size.bedrooms.min} max={pricing.size.bedrooms.max} display={bedroomLabel(q.bedrooms)} onChange={(v) => set('bedrooms', v)} />
                        <Stepper id="f-bathrooms" label="Bathrooms" noun="bathrooms" value={q.bathrooms} min={pricing.size.bathrooms.min} max={pricing.size.bathrooms.max} display={bathroomLabel(q.bathrooms)} onChange={(v) => set('bathrooms', v)} />
                      </div>
                    ) : (
                      <Field id="f-sqft" label="Approximate size (sq ft)" hint={`Between ${pricing.size.sqft.min.toLocaleString()} and ${pricing.size.sqft.max.toLocaleString()} sq ft.`} error={err('sqft')}>
                        <input
                          id="f-sqft" type="number" inputMode="numeric" min={pricing.size.sqft.min} max={pricing.size.sqft.max} step={pricing.size.sqft.step}
                          value={Number.isFinite(q.sqft) ? q.sqft : ''}
                          onChange={(e) => set('sqft', e.target.value === '' ? NaN : Number(e.target.value))}
                          aria-invalid={!!err('sqft') || undefined}
                          aria-describedby={describedBy('f-sqft', true, err('sqft'))}
                          className={`${inputCls(!!err('sqft'))} max-w-56`}
                        />
                      </Field>
                    )}
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4">
                    {!pricing.services[q.service].recurring && (
                      <p id="freq-note" className="flex gap-2 rounded-2xl bg-sky-50 p-4 text-sm text-sky-950">
                        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                        <span>A {pricing.services[q.service].label.toLowerCase()} is booked as a one-time visit. Recurring discounts apply to the standard clean.</span>
                      </p>
                    )}
                    <p id="freq-label" className="sr-only">Visit frequency</p>
                    <RadioCards<FrequencyId>
                      labelledBy="freq-label"
                      describedBy={!pricing.services[q.service].recurring ? 'freq-note' : undefined}
                      cols="sm:grid-cols-2"
                      value={effectiveFrequency(q)}
                      onChange={(v) => set('frequency', v)}
                      options={(Object.keys(pricing.frequencies) as FrequencyId[]).map((id) => {
                        const f = pricing.frequencies[id];
                        return {
                          value: id,
                          label: f.label,
                          icon: id === 'once' ? <CalendarDays className="size-5" /> : <Repeat className="size-5" />,
                          badge: f.discount > 0 ? `Save ${Math.round(f.discount * 100)}%` : undefined,
                          description: id === 'once' ? 'A single visit, no commitment.' : 'Discounted price on every visit.',
                          disabled: id !== 'once' && !pricing.services[q.service].recurring,
                        };
                      })}
                    />
                  </div>
                )}

                {step === 3 && (
                  <fieldset>
                    <legend className="mb-3 text-slate-600">Optional add-ons. Pick as many as you like.</legend>
                    <ul className="grid gap-3 sm:grid-cols-2">
                      {pricing.extras.map((x) => {
                        const qty = q.extras[x.id] ?? 0;
                        const on = qty > 0;
                        const max = x.maxQty ?? 1;
                        const unit = x.unit;
                        return (
                          <li key={x.id} className={`rounded-2xl border-2 bg-white transition ${on ? 'border-teal-700 bg-teal-50/70' : 'border-slate-200 hover:border-teal-600/60'}`}>
                            <label className="flex cursor-pointer items-start gap-3 p-4">
                              <input
                                type="checkbox" id={`x-${x.id}`} checked={on}
                                onChange={(e) => set('extras', { ...q.extras, [x.id]: e.target.checked ? 1 : 0 })}
                                className="mt-0.5 size-5 shrink-0 accent-teal-700"
                              />
                              <span className="flex-1">
                                <span className="block font-semibold text-ink">{x.label}</span>
                                {x.hint && <span className="block text-sm text-slate-600">{x.hint}</span>}
                              </span>
                              <span className="text-sm font-semibold text-teal-800">+{money(x.price)}{unit ? ` / ${unit}` : ''}</span>
                            </label>
                            {on && max > 1 && (
                              <div className="px-3 pb-3">
                                <Stepper id={`q-${x.id}`} label={`${unit ? unit[0].toUpperCase() + unit.slice(1) : 'Item'}s`} noun={`${unit ?? 'item'}s`} value={qty} min={1} max={max} display={`${qty} ${unit ?? 'item'}${qty === 1 ? '' : 's'}`} onChange={(v) => set('extras', { ...q.extras, [x.id]: v })} />
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </fieldset>
                )}

                {step === 4 && (
                  <div className="space-y-6">
                    <Field id="f-date" label="Preferred date" hint={pricing.weekendSurcharge > 0 ? `Weekend visits add ${money(pricing.weekendSurcharge)}.` : undefined} error={err('date')}>
                      <input
                        id="f-date" type="date"
                        min={isoDaysFromToday(pricing.booking.minDaysAhead)} max={isoDaysFromToday(pricing.booking.maxDaysAhead)}
                        value={q.date} onChange={(e) => set('date', e.target.value)}
                        aria-invalid={!!err('date') || undefined}
                        aria-describedby={describedBy('f-date', pricing.weekendSurcharge > 0, err('date'))}
                        className={`${inputCls(!!err('date'))} max-w-64`}
                      />
                    </Field>
                    <div>
                      <p id="tw-label" className="mb-1.5 font-semibold text-ink">Arrival window</p>
                      <RadioCards
                        id="f-timeWindow"
                        labelledBy="tw-label"
                        describedBy={err('timeWindow') ? 'f-timeWindow-error' : undefined}
                        invalid={!!err('timeWindow')}
                        cols="sm:grid-cols-3"
                        value={q.timeWindow}
                        onChange={(v) => set('timeWindow', v)}
                        options={pricing.timeWindows.map((t, i) => ({ value: t.id, label: t.label, description: t.hours, icon: windowIcons[i % 3] }))}
                      />
                      {err('timeWindow') && <p id="f-timeWindow-error" className="mt-1.5 text-sm font-medium text-red-700">{err('timeWindow')}</p>}
                    </div>
                  </div>
                )}

                {step === 5 && (
                  <div className="grid gap-5 sm:grid-cols-2">
                    <p className="flex gap-2 rounded-2xl bg-amber-50 p-4 text-sm text-amber-950 sm:col-span-2">
                      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                      <span><strong>Please note:</strong> nothing you type here is sent or saved. Feel free to use made-up details.</span>
                    </p>
                    <Field id="f-name" label="Your name" error={err('name')}>
                      <input id="f-name" type="text" autoComplete="off" value={q.name} onChange={(e) => set('name', e.target.value)} aria-invalid={!!err('name') || undefined} aria-describedby={describedBy('f-name', false, err('name'))} className={inputCls(!!err('name'))} placeholder="Alex Sample" />
                    </Field>
                    <Field id="f-email" label="Email" error={err('email')}>
                      <input id="f-email" type="email" autoComplete="off" value={q.email} onChange={(e) => set('email', e.target.value)} aria-invalid={!!err('email') || undefined} aria-describedby={describedBy('f-email', false, err('email'))} className={inputCls(!!err('email'))} placeholder="alex@example.com" />
                    </Field>
                    <Field id="f-zip" label="ZIP / postal code" error={err('zip')}>
                      <input id="f-zip" type="text" autoComplete="off" value={q.zip} onChange={(e) => set('zip', e.target.value)} aria-invalid={!!err('zip') || undefined} aria-describedby={describedBy('f-zip', false, err('zip'))} className={inputCls(!!err('zip'))} placeholder="00000" />
                    </Field>
                    <Field id="f-phone" label="Phone" optional error={err('phone')}>
                      <input id="f-phone" type="tel" autoComplete="off" value={q.phone} onChange={(e) => set('phone', e.target.value)} aria-invalid={!!err('phone') || undefined} aria-describedby={describedBy('f-phone', false, err('phone'))} className={inputCls(!!err('phone'))} />
                    </Field>
                    <Field id="f-notes" label="Anything we should know?" optional hint="Parking, access, areas to focus on…" error={err('notes')} className="sm:col-span-2">
                      <textarea id="f-notes" rows={3} value={q.notes} onChange={(e) => set('notes', e.target.value)} aria-invalid={!!err('notes') || undefined} aria-describedby={describedBy('f-notes', true, err('notes'))} className={inputCls(!!err('notes'))} />
                    </Field>
                  </div>
                )}
              </div>

              <p role="status" aria-live="polite" className="mt-4 min-h-6 text-sm font-semibold text-red-700">{status}</p>

              <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
                {step > 0 ? (
                  <button type="button" onClick={() => go(step - 1)} className="btn-ghost">
                    <ArrowLeft className="size-4" aria-hidden="true" /> Back
                  </button>
                ) : <span />}
                <button type="submit" className="btn-primary" data-testid="next">
                  {step < STEPS.length - 1 ? <>Next: {STEPS[step + 1].short} <ArrowRight className="size-4" aria-hidden="true" /></> : <>Get my estimate <Check className="size-4" aria-hidden="true" /></>}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {submitted ? <LeadPreview q={q} est={est} /> : <LiveSummary q={q} est={est} />}
      {!submitted && <MobileBar est={est} />}
    </div>
  );
}

/* ------------------------------------------------------------------------- */

function Progress({ step, maxStep, onGo }: { step: number; maxStep: number; onGo: (n: number) => void }) {
  return (
    <nav aria-label="Estimate steps" className="border-b border-slate-100 px-5 pb-4 pt-5 sm:px-8">
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
        <div className="h-full rounded-full bg-gradient-to-r from-teal-600 to-sky-500 transition-[width] duration-500" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
      </div>
      <ol className="grid grid-cols-6 gap-1">
        {STEPS.map((s, i) => {
          const done = i < step;
          const current = i === step;
          const reachable = i <= maxStep && !current;
          const dot = (
            <span aria-hidden="true" className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold transition ${current ? 'bg-teal-700 text-white ring-4 ring-teal-700/15' : done || i <= maxStep ? 'bg-teal-100 text-teal-900' : 'bg-slate-100 text-slate-600'}`}>
              {done ? <Check className="size-4" strokeWidth={3} /> : i + 1}
            </span>
          );
          const label = <span className={`text-xs font-semibold leading-tight ${current ? 'text-ink' : 'text-slate-600'} ${current ? '' : 'max-md:sr-only'}`}>{s.short}</span>;
          const cls = 'flex w-full flex-col items-center gap-1.5 rounded-xl px-1 py-1 text-center';
          return (
            <li key={s.id} className={current ? 'max-md:col-span-1' : ''}>
              {reachable ? (
                <button type="button" onClick={() => onGo(i)} className={`${cls} hover:bg-slate-50`} aria-label={`Step ${i + 1}: ${s.short}${done ? ' (completed)' : ''}, go back`}>
                  {dot}{label}
                </button>
              ) : (
                <span className={cls} aria-current={current ? 'step' : undefined}>
                  {dot}{label}
                  {!current && <span className="sr-only">Step {i + 1}: {s.short}, not reached yet</span>}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function Breakdown({ est, id }: { est: Estimate; id?: string }) {
  return (
    <ul id={id} className="divide-y divide-slate-100 text-sm" data-testid="breakdown">
      {est.lines.map((l, i) => (
        <li key={i} className="flex items-baseline justify-between gap-3 py-2">
          <span className="min-w-0">
            <span className={`block font-medium ${l.kind === 'discount' ? 'text-teal-800' : 'text-ink'}`}>{l.label}</span>
            {l.detail && <span className="block text-xs text-slate-600">{l.detail}</span>}
          </span>
          <span className={`shrink-0 font-semibold tabular-nums ${l.kind === 'discount' ? 'text-teal-800' : 'text-ink'}`} data-amount={l.amount}>{signedMoney(l.amount)}</span>
        </li>
      ))}
    </ul>
  );
}

function Total({ est, big }: { est: Estimate; big?: boolean }) {
  return (
    <div aria-live="polite" aria-atomic="true">
      <span className="sr-only">Estimated total: </span>
      <span key={est.total} className={`price-pop inline-block font-extrabold tracking-tight text-ink tabular-nums ${big ? 'text-5xl' : 'text-4xl'}`} data-testid="total">{money(est.total)}</span>
      <span className="ml-2 text-sm font-medium text-slate-600">{est.recurring ? 'per visit' : 'one-time visit'}</span>
    </div>
  );
}

const fine = 'Sample prices. Final price confirmed after a short written brief.';

function LiveSummary({ q, est }: { q: QuoteData; est: Estimate }) {
  return (
    <aside aria-labelledby="live-title" className="hidden lg:sticky lg:top-6 lg:block" data-testid="live-summary">
      <div className="overflow-hidden rounded-3xl border border-teal-900/10 bg-white shadow-[0_20px_60px_-25px_rgba(11,34,51,0.25)]">
        <div className="bg-gradient-to-br from-teal-50 via-white to-sky-50 p-6">
          <h3 id="live-title" className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-teal-800">
            <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-teal-500 opacity-60 motion-reduce:hidden" /><span className="relative inline-flex size-2 rounded-full bg-teal-600" /></span>
            Live estimate
          </h3>
          <div className="mt-2"><Total est={est} /></div>
          <p className="mt-1 text-sm text-slate-600">{pricing.services[q.service].label} · {q.sizeMode === 'rooms' ? `${bedroomLabel(q.bedrooms)}, ${bathroomLabel(q.bathrooms)}` : `${q.sqft || 0} sq ft`}</p>
        </div>
        <div className="px-6 pb-5 pt-2">
          <Breakdown est={est} />
          <p className="mt-3 flex gap-2 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600"><Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />{fine}</p>
        </div>
      </div>
    </aside>
  );
}

function MobileBar({ est }: { est: Estimate }) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = document.getElementById('calculator');
    if (!el || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(([e]) => { setVisible(e.isIntersecting); if (!e.isIntersecting) setOpen(false); }, { rootMargin: '0px 0px -30% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div className={`fixed inset-x-0 bottom-0 z-40 transition-transform duration-300 lg:hidden ${visible ? 'translate-y-0' : 'translate-y-full invisible'}`} data-testid="mobile-bar">
      {open && (
        <div id="mobile-breakdown" className="max-h-[50vh] overflow-y-auto border-t border-slate-200 bg-white px-5 pb-2 pt-3 shadow-[0_-12px_30px_-12px_rgba(11,34,51,0.25)]">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-teal-800">Your estimate breakdown</h3>
          <Breakdown est={est} />
          <p className="pb-2 pt-1 text-xs text-slate-600">{fine}</p>
        </div>
      )}
      <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-white/95 px-5 py-3 backdrop-blur pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-800">Live estimate</p>
          <div className="[&_[data-testid=total]]:text-2xl"><Total est={est} /></div>
        </div>
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="mobile-breakdown" className="btn-ghost shrink-0 !px-3.5">
          Breakdown <ChevronUp className={`size-4 transition ${open ? '' : 'rotate-180'}`} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function details(q: QuoteData) {
  const extras = pricing.extras.filter((x) => (q.extras[x.id] ?? 0) > 0).map((x) => (x.maxQty ? `${x.label} (${q.extras[x.id]} ${x.unit}${q.extras[x.id] === 1 ? '' : 's'})` : x.label));
  const tw = pricing.timeWindows.find((t) => t.id === q.timeWindow);
  return [
    { k: 'Service', v: pricing.services[q.service].label, icon: <Home className="size-4" /> },
    { k: 'Home size', v: q.sizeMode === 'rooms' ? `${bedroomLabel(q.bedrooms)}, ${bathroomLabel(q.bathrooms)}` : `${q.sqft.toLocaleString(pricing.locale)} sq ft`, icon: <Building2 className="size-4" /> },
    { k: 'Frequency', v: pricing.frequencies[effectiveFrequency(q)].label, icon: <Repeat className="size-4" /> },
    { k: 'Extras', v: extras.length ? extras.join(', ') : 'None', icon: <Sparkles className="size-4" /> },
    { k: 'Date & time', v: `${formatDate(q.date)}${isWeekend(q.date) ? ' (weekend)' : ''} · ${tw ? `${tw.label}, ${tw.hours}` : ''}`, icon: <CalendarDays className="size-4" /> },
  ];
}

function SummaryScreen({ q, est, headingRef, onEdit, onRestart }: { q: QuoteData; est: Estimate; headingRef: React.RefObject<HTMLHeadingElement | null>; onEdit: () => void; onRestart: () => void }) {
  return (
    <section aria-labelledby="estimate-title" className="p-5 sm:p-8" data-testid="summary">
      <div role="status" className="flex gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
        <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <p><strong>Request not sent.</strong> This form is not connected, so nothing was sent anywhere. On a live business site, this request would arrive in the owner’s inbox as a ready-to-quote lead.</p>
      </div>
      <h3 id="estimate-title" ref={headingRef} tabIndex={-1} className="mt-6 text-3xl font-bold tracking-tight text-ink">Your estimate</h3>
      <p className="mt-1 text-slate-600">Thanks, {q.name.trim().split(/\s+/)[0]}. Here is the estimate for your request.</p>
      <div className="mt-5 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl bg-gradient-to-br from-teal-50 to-sky-50 p-5">
          <Total est={est} big />
          <div className="mt-3"><Breakdown est={est} /></div>
        </div>
        <div>
          <h4 className="font-semibold text-ink">Request details</h4>
          <dl className="mt-2 space-y-3 text-sm">
            {details(q).map((d) => (
              <div key={d.k}>
                <dt className="flex items-center gap-3 font-semibold text-ink"><span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-lg bg-teal-50 text-teal-800">{d.icon}</span>{d.k}</dt>
                <dd className="pl-10 text-slate-700">{d.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      <p className="mt-6 flex gap-2 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
        <Mail className="mt-0.5 size-4 shrink-0 text-teal-800" aria-hidden="true" />
        <span><strong className="text-ink">Final price confirmed after a short written brief.</strong> The business replies by email to check the details, then confirms the price in writing. Prices shown are samples.</span>
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={onEdit} className="btn-ghost"><Pencil className="size-4" aria-hidden="true" /> Edit request</button>
        <button type="button" onClick={onRestart} className="btn-ghost"><RotateCcw className="size-4" aria-hidden="true" /> Start a new estimate</button>
      </div>
    </section>
  );
}

function LeadPreview({ q, est }: { q: QuoteData; est: Estimate }) {
  const rows = [
    ...details(q),
    { k: 'Name', v: q.name },
    { k: 'Email', v: q.email },
    { k: 'ZIP', v: q.zip },
    ...(q.phone.trim() ? [{ k: 'Phone', v: q.phone }] : []),
    ...(q.notes.trim() ? [{ k: 'Notes', v: q.notes }] : []),
  ];
  return (
    <aside aria-labelledby="lead-title" className="lg:sticky lg:top-6" data-testid="lead-preview">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_-25px_rgba(11,34,51,0.25)]">
        <div className="flex items-center gap-3 bg-ink px-5 py-4 text-white">
          <Inbox className="size-5 text-teal-300" aria-hidden="true" />
          <div>
            <h3 id="lead-title" className="font-semibold">What the owner would receive</h3>
            <p className="text-xs text-slate-300">Lead preview · not sent</p>
          </div>
        </div>
        <div className="p-5 text-sm">
          <p className="font-semibold text-ink">New request: {pricing.services[q.service].label}, {money(est.total)}{est.recurring ? '/visit' : ''}</p>
          <dl className="mt-3 divide-y divide-slate-100">
            {rows.map((r) => (
              <div key={r.k} className="grid grid-cols-[6.5rem_1fr] gap-2 py-1.5">
                <dt className="text-slate-600">{r.k}</dt><dd className="break-words font-medium text-ink">{r.v}</dd>
              </div>
            ))}
            <div className="grid grid-cols-[6.5rem_1fr] gap-2 py-1.5"><dt className="text-slate-600">Estimate</dt><dd className="font-bold text-teal-800">{money(est.total)}</dd></div>
          </dl>
        </div>
      </div>
    </aside>
  );
}
