import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { Check, Minus, Plus } from 'lucide-react';

/* ---------------------------------------------------------------------------
 * RadioCards — accessible radio group (role="radiogroup") built from buttons,
 * with roving tabindex and arrow-key navigation (no input `name` needed).
 * ------------------------------------------------------------------------- */
export interface RadioOption<T extends string> {
  value: T;
  label: string;
  description?: string;
  meta?: string;
  badge?: string;
  icon?: ReactNode;
  disabled?: boolean;
}

export function RadioCards<T extends string>(props: {
  labelledBy: string;
  describedBy?: string;
  options: RadioOption<T>[];
  value: T | '';
  onChange: (v: T) => void;
  cols?: string;
  invalid?: boolean;
  id?: string;
  compact?: boolean;
}) {
  const { options, value, onChange } = props;
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const enabled = options.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i >= 0);
  const current = options.findIndex((o) => o.value === value && !o.disabled);
  const tabStop = current >= 0 ? current : enabled[0];

  const onKey = (e: KeyboardEvent, i: number) => {
    const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const pos = enabled.indexOf(i);
    let next = pos;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (pos + 1) % enabled.length;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (pos - 1 + enabled.length) % enabled.length;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = enabled.length - 1;
    const idx = enabled[next];
    onChange(options[idx].value);
    refs.current[idx]?.focus();
  };

  return (
    <div
      role="radiogroup"
      id={props.id}
      aria-labelledby={props.labelledBy}
      aria-describedby={props.describedBy}
      aria-invalid={props.invalid || undefined}
      className={`grid gap-3 ${props.cols ?? 'sm:grid-cols-3'}`}
    >
      {options.map((o, i) => {
        const checked = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => { refs.current[i] = el; }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-disabled={o.disabled || undefined}
            tabIndex={i === tabStop ? 0 : -1}
            onClick={() => !o.disabled && onChange(o.value)}
            onKeyDown={(e) => onKey(e, i)}
            data-value={o.value}
            className={[
              'group relative flex h-full w-full rounded-2xl border-2 bg-white text-left transition',
              props.compact ? 'items-center gap-3 px-4 py-3' : 'flex-col gap-2 p-4',
              checked ? 'border-teal-700 bg-teal-50/70 shadow-[0_0_0_4px_rgba(15,118,110,0.12)]' : props.invalid ? 'border-red-400 hover:border-red-600' : 'border-slate-200 hover:border-teal-600/60 hover:bg-slate-50',
              o.disabled ? 'cursor-not-allowed opacity-55 hover:border-slate-200 hover:bg-white' : 'cursor-pointer',
            ].join(' ')}
          >
            <span className="flex w-full items-start gap-3">
              {o.icon && (
                <span aria-hidden="true" className={`grid size-10 shrink-0 place-items-center rounded-xl ${checked ? 'bg-teal-700 text-white' : 'bg-teal-50 text-teal-800'}`}>
                  {o.icon}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold text-ink">
                  {o.label}
                  {o.badge && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-900">{o.badge}</span>}
                </span>
                {o.description && <span className="mt-1 block text-sm leading-snug text-slate-600">{o.description}</span>}
              </span>
              <span aria-hidden="true" className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2 ${checked ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300'}`}>
                {checked && <Check className="size-3" strokeWidth={3.5} />}
              </span>
            </span>
            {o.meta && <span className={`text-sm font-semibold ${props.compact ? 'ml-auto' : ''} text-teal-800`}>{o.meta}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Stepper — − value + counter. Uses aria-disabled so focus is never lost.
 * ------------------------------------------------------------------------- */
export function Stepper(props: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  display: string;
  noun: string;
  onChange: (v: number) => void;
}) {
  const { value, min, max, onChange } = props;
  const btn = 'grid size-11 place-items-center rounded-xl border-2 border-slate-200 bg-white text-ink transition hover:border-teal-600 aria-disabled:cursor-not-allowed aria-disabled:opacity-40 aria-disabled:hover:border-slate-200';
  return (
    <div role="group" aria-labelledby={`${props.id}-label`} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-3 pl-4">
      <span id={`${props.id}-label`} className="font-semibold text-ink">{props.label}</span>
      <span className="flex items-center gap-2">
        <button type="button" className={btn} aria-label={`Fewer ${props.noun}`} aria-disabled={value <= min || undefined} onClick={() => value > min && onChange(value - 1)}>
          <Minus className="size-4" aria-hidden="true" />
        </button>
        <output id={`${props.id}-value`} aria-live="polite" className="min-w-24 text-center font-semibold tabular-nums text-ink">{props.display}</output>
        <button type="button" className={btn} aria-label={`More ${props.noun}`} aria-disabled={value >= max || undefined} onClick={() => value < max && onChange(value + 1)}>
          <Plus className="size-4" aria-hidden="true" />
        </button>
      </span>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Field — label + hint + error wiring for a single input.
 * ------------------------------------------------------------------------- */
export function Field(props: { id: string; label: string; optional?: boolean; hint?: string; error?: string; children: ReactNode; className?: string }) {
  return (
    <div className={props.className}>
      <label htmlFor={props.id} className="mb-1.5 block font-semibold text-ink">
        {props.label} {props.optional && <span className="font-normal text-slate-600">(optional)</span>}
      </label>
      {props.hint && <p id={`${props.id}-hint`} className="mb-2 text-sm text-slate-600">{props.hint}</p>}
      {props.children}
      {props.error && <p id={`${props.id}-error`} className="mt-1.5 text-sm font-medium text-red-700">{props.error}</p>}
    </div>
  );
}

export const inputCls = (invalid?: boolean) =>
  `block w-full rounded-xl border-2 bg-white px-3.5 py-2.5 text-base text-ink placeholder:text-slate-500 transition focus:border-teal-700 ${invalid ? 'border-red-600' : 'border-slate-300 hover:border-slate-400'}`;

export const describedBy = (id: string, hint?: boolean, error?: string) =>
  [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined;
