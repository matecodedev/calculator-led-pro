import { describe, expect, it } from 'vitest';

import { formatNumericValue, parseNumericInput, sanitizeNumericInput } from './decimalInput';

describe('sanitizeNumericInput', () => {
  it('keeps a decimal typed with a dot', () => {
    expect(sanitizeNumericInput('4.5')).toBe('4.5');
  });

  it('keeps a decimal typed with a comma, as a Spanish keyboard produces it', () => {
    expect(sanitizeNumericInput('2,5')).toBe('2,5');
  });

  it('keeps a half-typed decimal so the separator can be pressed at all', () => {
    expect(sanitizeNumericInput('4.')).toBe('4.');
    expect(sanitizeNumericInput('4,')).toBe('4,');
  });

  it('accepts a value written without its leading zero', () => {
    expect(sanitizeNumericInput('.5')).toBe('.5');
  });

  it('refuses a second separator', () => {
    expect(sanitizeNumericInput('4.5.2')).toBe('4.52');
    expect(sanitizeNumericInput('1,2,3')).toBe('1,23');
  });

  it('drops anything that is not part of a number', () => {
    expect(sanitizeNumericInput('4.5 m')).toBe('4.5');
    expect(sanitizeNumericInput('-3')).toBe('3');
    expect(sanitizeNumericInput('abc')).toBe('');
  });

  it('refuses a fractional part where whole units are the only thing that exists', () => {
    expect(sanitizeNumericInput('6.5', 'integer')).toBe('65');
    expect(sanitizeNumericInput('12', 'integer')).toBe('12');
  });
});

describe('parseNumericInput', () => {
  it('reads both separators as the same decimal point', () => {
    expect(parseNumericInput('4.5')).toBe(4.5);
    expect(parseNumericInput('4,5')).toBe(4.5);
  });

  it('reads a half-typed decimal as the part already typed', () => {
    expect(parseNumericInput('4.')).toBe(4);
    expect(parseNumericInput('4,')).toBe(4);
    expect(parseNumericInput(',5')).toBe(0.5);
  });

  it('has no number for an empty field or a lone separator', () => {
    expect(parseNumericInput('')).toBeNull();
    expect(parseNumericInput('   ')).toBeNull();
    expect(parseNumericInput('.')).toBeNull();
    expect(parseNumericInput(',')).toBeNull();
  });

  it('has no number for text that is not one', () => {
    expect(parseNumericInput('abc')).toBeNull();
  });
});

describe('formatNumericValue', () => {
  it('shows a decimal as it was entered', () => {
    expect(formatNumericValue(4.5)).toBe('4.5');
    expect(formatNumericValue(0)).toBe('0');
  });

  it('shows nothing for a value nobody has declared', () => {
    expect(formatNumericValue(null)).toBe('');
    expect(formatNumericValue(undefined)).toBe('');
    expect(formatNumericValue(Number.NaN)).toBe('');
  });
});
