import * as React from 'react';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * Clears a (possibly React-controlled) input using the native value setter so
 * React's onChange still fires, then dispatches an input event. Exported so
 * callers that reset inputs imperatively (e.g. a "reset filters" button) can
 * reuse it and keep the clear affordance in sync.
 */
export function clearNativeInput(el: HTMLInputElement | null) {
  if (!el) return;
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  )?.set;
  setter?.call(el, '');
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

export interface ClearableInputProps extends React.ComponentProps<'input'> {
  /** Accessible label for the clear button. */
  clearLabel?: string;
  /** Optional side effect run after the value is cleared. */
  onClear?: () => void;
}

/**
 * Text input that shows a clear (✕) button on the right while it holds a value.
 * Works for both controlled (`value`) and uncontrolled (`defaultValue`) inputs.
 */
const ClearableInput = React.forwardRef<HTMLInputElement, ClearableInputProps>(
  (
    {
      className,
      value,
      defaultValue,
      onChange,
      onClear,
      clearLabel = 'Clear',
      disabled,
      ...props
    },
    forwardedRef,
  ) => {
    const innerRef = React.useRef<HTMLInputElement>(null);
    const setRefs = React.useCallback(
      (node: HTMLInputElement | null) => {
        innerRef.current = node;
        if (typeof forwardedRef === 'function') forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      },
      [forwardedRef],
    );

    const isControlled = value !== undefined;
    const [uncontrolledHasValue, setUncontrolledHasValue] = React.useState(
      () => String(defaultValue ?? '').length > 0,
    );
    const hasValue = isControlled
      ? String(value ?? '').length > 0
      : uncontrolledHasValue;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!isControlled) setUncontrolledHasValue(e.target.value.length > 0);
      onChange?.(e);
    };

    const handleClear = () => {
      const el = innerRef.current;
      if (el) {
        clearNativeInput(el);
        el.focus();
      }
      if (!isControlled) setUncontrolledHasValue(false);
      onClear?.();
    };

    const showClear = hasValue && !disabled;

    return (
      <div className="relative w-full">
        <Input
          ref={setRefs}
          value={value}
          defaultValue={defaultValue}
          onChange={handleChange}
          disabled={disabled}
          className={cn(className, showClear && 'pr-8')}
          {...props}
        />
        {showClear && (
          <button
            type="button"
            tabIndex={-1}
            aria-label={clearLabel}
            onClick={handleClear}
            className="absolute right-2 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
    );
  },
);
ClearableInput.displayName = 'ClearableInput';

export { ClearableInput };
