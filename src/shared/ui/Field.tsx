import { useId, type ReactNode } from 'react';
import { labelClass } from './controls';

interface FieldProps {
  label: string;
  /** Optional note rendered to the right of the label, e.g. a reference value. */
  note?: ReactNode;
  className?: string;
  /** Receives the id to put on the control, so the label actually points at it. */
  children: (controlId: string) => ReactNode;
}

/**
 * A labelled form control. The id is generated and wired to `htmlFor`, so
 * tapping the label focuses the control and screen readers announce it.
 */
export default function Field({ label, note, className, children }: FieldProps) {
  const id = useId();

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className={labelClass}>
          {label}
        </label>
        {note}
      </div>
      {children(id)}
    </div>
  );
}
