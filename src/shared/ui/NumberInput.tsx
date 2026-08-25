import { useState, type InputHTMLAttributes } from 'react';

import {
  formatNumericValue,
  parseNumericInput,
  sanitizeNumericInput,
  type NumericMode,
} from '../number/decimalInput';

type PassedThrough = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type' | 'inputMode' | 'min' | 'max' | 'step'
>;

interface NumberInputProps extends PassedThrough {
  /** Null shows an empty field — a measurement nobody has declared yet. */
  value: number | null;
  /** Null while the field is empty; the caller decides what that means. */
  onChange: (value: number | null) => void;
  mode?: NumericMode;
}

/**
 * A numeric field that lets a decimal be typed.
 *
 * The trouble with the `type="number"` fields this replaces was not the parsing
 * but the round trip: the value shown came from the number in state, so every
 * keystroke that did not yet form a number — the "4." on the way to "4.5", or a
 * comma on a Spanish keyboard, which the browser reports as an empty string —
 * collapsed to 0 and took the field's contents with it. A screen could only be
 * a whole number of metres, which no touring screen is.
 *
 * While the field is being edited it shows exactly what was typed, and reports
 * whatever number that text already makes. The moment editing stops it shows
 * the stored value again, so the field and the plan can never disagree.
 *
 * Bounds are deliberately not enforced here: the domain validates the whole
 * project and says what is wrong in words, which a silently clamped field
 * cannot do.
 */
export default function NumberInput({
  value,
  onChange,
  mode = 'decimal',
  onBlur,
  ...rest
}: NumberInputProps) {
  // Null means "not being edited": the field follows the stored value.
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <input
      {...rest}
      type="text"
      inputMode={mode === 'integer' ? 'numeric' : 'decimal'}
      autoComplete={rest.autoComplete ?? 'off'}
      value={draft ?? formatNumericValue(value)}
      onChange={(e) => {
        const text = sanitizeNumericInput(e.target.value, mode);
        setDraft(text);
        onChange(parseNumericInput(text));
      }}
      onBlur={(e) => {
        setDraft(null);
        onBlur?.(e);
      }}
    />
  );
}
