import * as React from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
} from 'lucide-react';
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type DatePickerProps = {
  /** Value as `yyyy-MM-dd` (matches the old native date input contract). */
  value?: string;
  onChange: (value: string) => void;
  /** BCP-47 locale, e.g. `en-US` / `zh-CN`. Drives format + calendar UI language. */
  locale?: string;
  placeholder?: string;
  todayLabel?: string;
  clearLabel?: string;
  id?: string;
  className?: string;
  triggerClassName?: string;
};

type DateType = 'year' | 'month' | 'day';

const FIELD_WIDTHS: Record<DateType, number> = { year: 4, month: 2, day: 2 };
const TOTAL_DATE_DIGITS = 8;

// Re-mask a raw digit string into the locale's field order, inserting the
// separator once a field is complete and the next field's first digit arrives.
function maskDate(rawDigits: string, order: DateType[], separator: string): string {
  let result = '';
  let consumed = 0;
  for (let f = 0; f < order.length; f += 1) {
    const width = FIELD_WIDTHS[order[f]];
    const slice = rawDigits.slice(consumed, consumed + width);
    if (!slice) break;
    if (f > 0) result += separator;
    result += slice;
    consumed += width;
    if (slice.length < width) break; // field still incomplete → no trailing separator
  }
  return result;
}

// Caret position in `masked` just after `digitCount` digits (for cursor restore).
function caretAfterDigits(masked: string, digitCount: number): number {
  if (digitCount <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < masked.length; i += 1) {
    if (masked[i] >= '0' && masked[i] <= '9' && (seen += 1) === digitCount) return i + 1;
  }
  return masked.length;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function toISO(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseISO(s?: string): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const YEARS_PER_PAGE = 12;

export function DatePicker({
  value,
  onChange,
  locale = 'en-US',
  placeholder,
  todayLabel,
  clearLabel,
  id,
  className,
  triggerClassName,
}: DatePickerProps) {
  const selected = React.useMemo(() => parseISO(value), [value]);
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<'days' | 'years'>('days');
  const [view, setView] = React.useState(() => selected ?? new Date());
  const [draft, setDraft] = React.useState('');
  const editingRef = React.useRef(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const caretRef = React.useRef<number | null>(null);

  // en-US weeks start Sunday; zh-CN (and most others here) start Monday.
  const firstDayOfWeek = locale.toLowerCase().startsWith('en') ? 0 : 1;

  // Numeric formatter doubles as the editable text format; formatToParts tells us
  // the locale's field order + separator so typed input maps to the right field.
  const numFmt = React.useMemo(
    () => new Intl.DateTimeFormat(locale, { year: 'numeric', month: '2-digit', day: '2-digit' }),
    [locale],
  );
  const { order, separator } = React.useMemo(() => {
    const parts = numFmt.formatToParts(new Date(2026, 0, 2));
    const fieldOrder = parts
      .filter((p): p is Intl.DateTimeFormatPart & { type: DateType } =>
        p.type === 'year' || p.type === 'month' || p.type === 'day',
      )
      .map((p) => p.type);
    const lit = parts.find((p) => p.type === 'literal' && /\S/.test(p.value));
    return { order: fieldOrder, separator: lit?.value ?? '/' };
  }, [numFmt]);
  const pattern = React.useMemo(
    () =>
      order
        .map((t) => (t === 'year' ? 'YYYY' : t === 'month' ? 'MM' : 'DD'))
        .join(separator),
    [order, separator],
  );

  const formatNumeric = React.useCallback((d: Date) => numFmt.format(d), [numFmt]);

  const parseNumeric = React.useCallback(
    (s: string): Date | null => {
      const nums = s.match(/\d+/g);
      if (!nums || nums.length < 3) return null;
      const map = {} as Record<DateType, number>;
      order.forEach((t, i) => (map[t] = Number(nums[i])));
      const { year, month, day } = map;
      if (!year || !month || !day || month < 1 || month > 12 || day < 1 || day > 31) return null;
      const d = new Date(year, month - 1, day);
      // Reject overflow (e.g. Feb 30 rolling into March).
      if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
      return d;
    },
    [order],
  );

  // Keep the text field in sync with the value unless the user is mid-edit.
  React.useEffect(() => {
    if (!editingRef.current) setDraft(selected ? formatNumeric(selected) : '');
  }, [selected, formatNumeric]);

  // Restore the caret after masking re-writes the draft (typing only; left null
  // for programmatic draft changes like calendar selection or value sync).
  React.useLayoutEffect(() => {
    if (caretRef.current != null && inputRef.current) {
      const pos = caretRef.current;
      caretRef.current = null;
      inputRef.current.setSelectionRange(pos, pos);
    }
  }, [draft]);

  // Reset the panel to the selected month (day view) each time it opens.
  React.useEffect(() => {
    if (open) {
      setMode('days');
      setView(selected ?? new Date());
    }
  }, [open, selected]);

  const displayFmt = React.useMemo(
    () => new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long' }),
    [locale],
  );
  const weekdays = React.useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { weekday: 'short' });
    // Jan 1 2023 is a Sunday — use it as the anchor for weekday names.
    return Array.from({ length: 7 }, (_, i) =>
      fmt.format(new Date(2023, 0, 1 + ((firstDayOfWeek + i) % 7))),
    );
  }, [locale, firstDayOfWeek]);

  const year = view.getFullYear();
  const month = view.getMonth();
  const startOffset = (new Date(year, month, 1).getDay() - firstDayOfWeek + 7) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: startOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];

  const today = new Date();
  const yearPageStart = Math.floor(year / YEARS_PER_PAGE) * YEARS_PER_PAGE;

  const commit = (d: Date) => {
    onChange(toISO(d));
    setOpen(false);
  };

  const commitDraft = () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      onChange('');
      return;
    }
    const d = parseNumeric(trimmed);
    if (d) onChange(toISO(d));
    else setDraft(selected ? formatNumeric(selected) : ''); // revert invalid input
  };

  const clear = () => {
    onChange('');
    setDraft('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div
          className={cn(
            'flex h-9 w-full items-center gap-1.5 rounded-lg border border-border/60 bg-background/50 px-2.5 shadow-none transition-colors',
            'focus-within:ring-inset focus-within:ring-2 focus-within:ring-primary/40 hover:border-border',
            triggerClassName,
          )}
        >
          <input
            ref={inputRef}
            id={id}
            value={draft}
            placeholder={pattern || placeholder}
            autoComplete="off"
            onFocus={() => {
              editingRef.current = true;
            }}
            onBlur={() => {
              editingRef.current = false;
              commitDraft();
            }}
            onChange={(e) => {
              const el = e.target;
              const caret = el.selectionStart ?? el.value.length;
              const digitsBeforeCaret = el.value.slice(0, caret).replace(/\D/g, '').length;
              const digits = el.value.replace(/\D/g, '').slice(0, TOTAL_DATE_DIGITS);
              const masked = maskDate(digits, order, separator);
              caretRef.current = caretAfterDigits(masked, digitsBeforeCaret);
              setDraft(masked);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commitDraft();
                (e.target as HTMLInputElement).blur();
              }
            }}
            className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
          />
          {selected && (
            <button
              type="button"
              aria-label={clearLabel}
              className="shrink-0 rounded p-0.5 text-zinc-400 hover:bg-accent hover:text-foreground"
              onMouseDown={(e) => e.preventDefault()}
              onClick={clear}
            >
              <X className="size-3.5" />
            </button>
          )}
          <PopoverTrigger asChild>
            <button
              type="button"
              className="shrink-0 rounded p-0.5 text-zinc-400 hover:bg-accent hover:text-foreground"
            >
              <CalendarIcon className="size-3.5" />
            </button>
          </PopoverTrigger>
        </div>
      </PopoverAnchor>

      <PopoverContent className={cn('w-auto p-3', className)} align="start">
        {/* Header: «year ‹month  [title]  month› year» */}
        <div className="flex items-center justify-between gap-1 pb-2">
          <div className="flex items-center">
            <button
              type="button"
              aria-label="previous year"
              className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              onClick={() =>
                mode === 'years'
                  ? setView(new Date(year - YEARS_PER_PAGE, month, 1))
                  : setView(new Date(year - 1, month, 1))
              }
            >
              <ChevronsLeft className="size-4" />
            </button>
            {mode === 'days' && (
              <button
                type="button"
                aria-label="previous month"
                className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                onClick={() => setView(new Date(year, month - 1, 1))}
              >
                <ChevronLeft className="size-4" />
              </button>
            )}
          </div>

          <button
            type="button"
            className="rounded-md px-2 py-1 text-sm font-medium hover:bg-accent"
            onClick={() => setMode((m) => (m === 'days' ? 'years' : 'days'))}
          >
            {mode === 'days'
              ? displayFmt.format(view)
              : `${yearPageStart}–${yearPageStart + YEARS_PER_PAGE - 1}`}
          </button>

          <div className="flex items-center">
            {mode === 'days' && (
              <button
                type="button"
                aria-label="next month"
                className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                onClick={() => setView(new Date(year, month + 1, 1))}
              >
                <ChevronRight className="size-4" />
              </button>
            )}
            <button
              type="button"
              aria-label="next year"
              className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              onClick={() =>
                mode === 'years'
                  ? setView(new Date(year + YEARS_PER_PAGE, month, 1))
                  : setView(new Date(year + 1, month, 1))
              }
            >
              <ChevronsRight className="size-4" />
            </button>
          </div>
        </div>

        {mode === 'days' ? (
          <div className="grid grid-cols-7 gap-1">
            {weekdays.map((w, i) => (
              <div
                key={`wd-${i}`}
                className="flex h-7 items-center justify-center text-[10px] font-medium text-muted-foreground"
              >
                {w}
              </div>
            ))}
            {cells.map((d, i) =>
              d ? (
                <button
                  key={toISO(d)}
                  type="button"
                  onClick={() => commit(d)}
                  className={cn(
                    'flex size-8 items-center justify-center rounded-md text-xs transition-colors',
                    selected && sameDay(d, selected)
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'hover:bg-accent',
                    !(selected && sameDay(d, selected)) &&
                      sameDay(d, today) &&
                      'font-semibold text-primary',
                  )}
                >
                  {d.getDate()}
                </button>
              ) : (
                <div key={`empty-${i}`} className="size-8" />
              ),
            )}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: YEARS_PER_PAGE }, (_, i) => yearPageStart + i).map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => {
                  setView(new Date(y, month, 1));
                  setMode('days');
                }}
                className={cn(
                  'flex h-9 items-center justify-center rounded-md text-xs transition-colors',
                  selected && selected.getFullYear() === y
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'hover:bg-accent',
                  !(selected && selected.getFullYear() === y) &&
                    y === today.getFullYear() &&
                    'font-semibold text-primary',
                )}
              >
                {y}
              </button>
            ))}
          </div>
        )}

        {(todayLabel || clearLabel) && (
          <div className="mt-2 flex items-center justify-between gap-2 border-t border-border/40 pt-2">
            {todayLabel ? (
              <button
                type="button"
                className="rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-accent"
                onClick={() => commit(new Date())}
              >
                {todayLabel}
              </button>
            ) : (
              <span />
            )}
            {clearLabel && (
              <button
                type="button"
                className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                onClick={() => {
                  clear();
                  setOpen(false);
                }}
              >
                {clearLabel}
              </button>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
