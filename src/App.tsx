import { ArrowDown, ClipboardList, FileCode2, Gauge, Leaf, MousePointerClick, SlidersHorizontal, Sparkles } from 'lucide-react';
import Calculator from './components/Calculator.tsx';
import { pricing, type FrequencyId, type ServiceId } from './pricing.ts';
import { money } from './lib/estimate.ts';

const DEMO_LINE = 'Demo website by Ivan Litvin · fictional business, sample prices';

export default function App() {
  const services = Object.keys(pricing.services) as ServiceId[];
  const freqs = Object.keys(pricing.frequencies) as FrequencyId[];
  return (
    <>
      <a href="#calculator" className="skip-link">Skip to the estimate calculator</a>
      <header>
      <p className="bg-ink px-4 py-2 text-center text-sm font-medium text-white" data-testid="demo-banner">
        {DEMO_LINE}
      </p>

      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5">
        <a href="#top" className="flex items-center gap-2.5 rounded-lg font-bold text-ink">
          <span aria-hidden="true" className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-teal-600 to-sky-600 text-white shadow-md shadow-teal-700/25">
            <Leaf className="size-5" />
          </span>
          <span className="leading-tight">Mintleaf<span className="block text-xs font-medium text-slate-600">Home Cleaning · fictional</span></span>
        </a>
        <nav aria-label="Main">
          <ul className="flex items-center gap-1 text-sm font-semibold sm:gap-2">
            <li className="max-sm:hidden"><a className="nav-link" href="#owners">For owners</a></li>
            <li className="max-sm:hidden"><a className="nav-link" href="#prices">Sample prices</a></li>
            <li><a className="btn-primary !px-4 !py-2 text-sm" href="#calculator">Get an estimate</a></li>
          </ul>
        </nav>
      </div>
      </header>

      <main id="top">
        <section className="mx-auto max-w-6xl px-5 pb-8 pt-6 sm:pt-10" aria-labelledby="hero-title">
          <p className="inline-flex items-center gap-2 rounded-full border border-teal-700/15 bg-white/80 px-3 py-1 text-sm font-semibold text-teal-800 shadow-sm">
            <Sparkles className="size-4" aria-hidden="true" /> Instant cleaning estimate
          </p>
          <h1 id="hero-title" className="mt-4 max-w-3xl text-4xl font-extrabold tracking-tight text-ink sm:text-5xl lg:text-6xl">
            See your cleaning price <span className="bg-gradient-to-r from-teal-700 to-sky-700 bg-clip-text text-transparent">before you book.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-slate-700">
            Pick a service, your home size and a few extras. The estimate updates with every click, and the request arrives with every detail needed for a quote.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <a href="#calculator" className="btn-primary">Start my estimate <ArrowDown className="size-4" aria-hidden="true" /></a>
            <a href="#owners" className="btn-ghost">How it works for business owners</a>
          </div>
          <p className="mt-5 text-sm text-slate-600">All prices are examples. Every business sets its own.</p>
        </section>

        <section id="calculator" className="scroll-mt-4 mx-auto max-w-6xl px-3 pb-16 sm:px-5" aria-labelledby="calc-title">
          <h2 id="calc-title" className="sr-only">Cleaning estimate calculator</h2>
          <noscript>
            <p className="rounded-2xl bg-amber-50 p-4 text-amber-950">The estimate calculator needs JavaScript. Sample prices are listed below.</p>
          </noscript>
          <Calculator />
        </section>

        <section id="owners" className="scroll-mt-4 border-y border-teal-900/10 bg-white/70" aria-labelledby="owners-title">
          <div className="mx-auto max-w-6xl px-5 py-16">
            <p className="text-sm font-semibold uppercase tracking-wider text-teal-800">For business owners</p>
            <h2 id="owners-title" className="mt-2 max-w-3xl text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Your website calculates an instant estimate and collects ready-to-quote leads.
            </h2>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {[
                { icon: <Gauge className="size-6" />, t: 'Instant estimates', d: 'Visitors see an estimate in seconds, any time of day, without waiting for a reply.' },
                { icon: <ClipboardList className="size-6" />, t: 'Leads with all the details', d: 'Each request includes service, home size, frequency, extras, preferred date and contact info, so you can quote straight away.' },
                { icon: <SlidersHorizontal className="size-6" />, t: 'Prices easy to adjust', d: 'Every price and rule lives in one small config file. Change a number, publish, and the calculator uses it.' },
              ].map((c) => (
                <div key={c.t} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <span aria-hidden="true" className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-teal-50 to-sky-100 text-teal-800">{c.icon}</span>
                  <h3 className="mt-4 text-lg font-bold text-ink">{c.t}</h3>
                  <p className="mt-2 text-slate-700">{c.d}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 grid items-center gap-8 lg:grid-cols-2">
              <div>
                <h3 className="flex items-center gap-2 text-xl font-bold text-ink"><FileCode2 className="size-5 text-teal-800" aria-hidden="true" /> One file holds every price</h3>
                <p className="mt-3 text-slate-700">
                  Base prices, per-room and per-square-foot rates, frequency discounts, extras, weekend surcharge and minimum visit price are all in <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[0.9em] text-ink">src/pricing.ts</code>. Real prices drop in without touching the calculator code.
                </p>
                <ul className="mt-4 space-y-2 text-slate-700">
                  {['Static site: fast, nothing to maintain on a server', 'Works on phones, tablets and desktops', 'Keyboard and screen-reader friendly'].map((t) => (
                    <li key={t} className="flex gap-2"><MousePointerClick className="mt-1 size-4 shrink-0 text-teal-700" aria-hidden="true" />{t}</li>
                  ))}
                </ul>
              </div>
              <figure className="overflow-hidden rounded-2xl bg-ink shadow-xl">
                <figcaption className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5 text-xs text-slate-300">
                  <span aria-hidden="true" className="flex gap-1.5"><span className="size-2.5 rounded-full bg-white/25" /><span className="size-2.5 rounded-full bg-white/25" /><span className="size-2.5 rounded-full bg-white/25" /></span>
                  src/pricing.ts (excerpt)
                </figcaption>
                <pre tabIndex={0} aria-label="Pricing config excerpt" className="overflow-x-auto p-4 text-[13px] leading-relaxed text-slate-100"><code>{`services: {
  deep: {
    label: '${pricing.services.deep.label}',
    base: ${pricing.services.deep.base},
    perBedroom: ${pricing.services.deep.perBedroom},
    perBathroom: ${pricing.services.deep.perBathroom},
  },
},
frequencies: {
  weekly: { discount: ${pricing.frequencies.weekly.discount} }, // ${Math.round(pricing.frequencies.weekly.discount * 100)}% off
},
weekendSurcharge: ${pricing.weekendSurcharge},
minimumPrice: ${pricing.minimumPrice},`}</code></pre>
              </figure>
            </div>
          </div>
        </section>

        <section id="prices" className="scroll-mt-4 mx-auto max-w-6xl px-5 py-16" aria-labelledby="prices-title">
          <p className="text-sm font-semibold uppercase tracking-wider text-teal-800">Generated from the config</p>
          <h2 id="prices-title" className="mt-2 text-3xl font-bold tracking-tight text-ink">Sample prices</h2>
          <p className="mt-3 max-w-2xl text-slate-700">
            These are <strong>example prices</strong> for a fictional business. A real business sets its own, and the prices are easy for the owner to adjust.
          </p>
          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white p-2 lg:col-span-2" tabIndex={0} role="region" aria-label="Sample prices by service (scrollable table)">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Sample prices by service</caption>
                <thead>
                  <tr className="text-slate-600">
                    <th scope="col" className="p-3 font-semibold">Service</th>
                    <th scope="col" className="p-3 font-semibold">Base</th>
                    <th scope="col" className="p-3 font-semibold">Per bedroom</th>
                    <th scope="col" className="p-3 font-semibold">Per bathroom</th>
                    <th scope="col" className="p-3 font-semibold">Per sq ft</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {services.map((id) => {
                    const s = pricing.services[id];
                    return (
                      <tr key={id}>
                        <th scope="row" className="p-3 font-semibold text-ink">{s.label}</th>
                        <td className="p-3 tabular-nums">{money(s.base)}</td>
                        <td className="p-3 tabular-nums">{money(s.perBedroom)}</td>
                        <td className="p-3 tabular-nums">{money(s.perBathroom)}</td>
                        <td className="p-3 tabular-nums">{money(s.perSqFt, 2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="px-3 pb-2 pt-1 text-xs text-slate-600">Minimum visit {money(pricing.minimumPrice)} · weekend visits +{money(pricing.weekendSurcharge)} · sample prices only</p>
            </div>
            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <h3 className="font-bold text-ink">Frequency discounts</h3>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {freqs.map((f) => (
                    <li key={f} className="flex justify-between"><span>{pricing.frequencies[f].label}</span><span className="font-semibold tabular-nums text-teal-800">{pricing.frequencies[f].discount ? `−${Math.round(pricing.frequencies[f].discount * 100)}%` : '—'}</span></li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-slate-600">Recurring visits apply to the standard clean.</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <h3 className="font-bold text-ink">Extras</h3>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {pricing.extras.map((x) => (
                    <li key={x.id} className="flex justify-between gap-3"><span>{x.label}</span><span className="font-semibold tabular-nums">{money(x.price)}{x.unit ? ` / ${x.unit}` : ''}</span></li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-5 pb-20" aria-labelledby="faq-title">
          <h2 id="faq-title" className="text-3xl font-bold tracking-tight text-ink">Questions</h2>
          <div className="mt-6 space-y-3">
            {[
              { q: 'Is this a real cleaning company?', a: 'No. Mintleaf Home Cleaning is a fictional business made for a web development portfolio. Prices are samples and the form sends nothing.' },
              { q: 'Is the estimate the final price?', a: 'It is an estimate based on what you entered. The final price is confirmed after a short written brief, by email.' },
              { q: 'Where does my request go?', a: 'In this demo, nowhere: nothing is sent. Your choices stay only in this browser so a refresh does not lose them; contact details are never saved. A real site would deliver the request to the owner’s inbox.' },
              { q: 'Can the calculator match my own pricing?', a: 'Yes. Services, rates, discounts, extras and rules are set in one config file, so a business can use its own prices and options.' },
            ].map((f) => (
              <details key={f.q} className="group rounded-2xl border border-slate-200 bg-white p-5 open:shadow-sm">
                <summary className="cursor-pointer list-none rounded-lg font-semibold text-ink marker:hidden">
                  <span className="flex items-center justify-between gap-3">{f.q}<span aria-hidden="true" className="text-xl leading-none text-teal-700 transition group-open:rotate-45">+</span></span>
                </summary>
                <p className="mt-3 text-slate-700">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white pb-28 lg:pb-0">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-semibold text-ink" data-testid="demo-footer">{DEMO_LINE}</p>
          <p>Contact (fictional): <a className="font-medium text-teal-800 underline underline-offset-2" href="mailto:hello@example.com">hello@example.com</a></p>
        </div>
      </footer>
    </>
  );
}
