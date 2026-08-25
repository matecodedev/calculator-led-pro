/**
 * Reading a number out of a field a person is still typing into.
 *
 * `<input type="number">` looked like the right control and was not. It reports
 * an empty string for anything the browser cannot parse, so on a Spanish
 * keyboard — where the decimal key is a comma — typing "4,5" hands the app "",
 * which became 0 and wiped the field. The same happens mid-keystroke on a
 * locale that uses the dot: "4." is not a number yet.
 *
 * So the app reads the text itself. A comma and a dot both mean the same thing
 * here: nobody typing a screen width means "four thousand five hundred".
 */

/** Whether the field admits a fractional part. Cabinets and ports never do. */
export type NumericMode = 'decimal' | 'integer';

const SEPARATOR = /[.,]/;

/**
 * Drops what cannot belong in the number, keeping the rest exactly as typed.
 *
 * Only the first separator survives, so "4.5.2" cannot be entered, and the one
 * that survives stays the character the technician pressed — a field that
 * silently rewrites the comma you just typed is a field you cannot type in.
 *
 * No sign is accepted: every measurement in this app is a distance, a weight or
 * a current, and none of them run backwards.
 */
export function sanitizeNumericInput(raw: string, mode: NumericMode = 'decimal'): string {
  const kept = raw.replace(/[^\d.,]/g, '');
  if (mode === 'integer') return kept.replace(/[.,]/g, '');

  const first = kept.search(SEPARATOR);
  if (first === -1) return kept;

  const whole = kept.slice(0, first);
  const fraction = kept.slice(first + 1).replace(/[.,]/g, '');
  return `${whole}${kept[first]}${fraction}`;
}

/**
 * The number the text stands for, or null while it does not stand for one yet —
 * an empty field, or a lone separator the user is about to type digits after.
 */
export function parseNumericInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;

  const value = Number(trimmed.replace(',', '.'));
  return Number.isFinite(value) ? value : null;
}

/** How a stored value is shown once the field is no longer being edited. */
export function formatNumericValue(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '';
  return String(value);
}
