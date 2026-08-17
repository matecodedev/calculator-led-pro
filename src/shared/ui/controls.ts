/**
 * Shared control styling.
 *
 * Every focus style here is `focus-visible`, so a keyboard user always sees
 * where they are while a mouse click stays quiet.
 */

const FOCUS_RING =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#CCFF00]';

export const labelClass = 'block text-[11px] uppercase tracking-wide text-neutral-400 mb-1';

export const compactLabelClass = 'block text-[11px] uppercase tracking-wide text-neutral-400 mb-1';

export const textControlClass =
  `w-full bg-[#1A1A1A] border border-[#444] px-3 py-2 text-white font-mono transition-colors ` +
  `hover:border-[#666] focus:border-[#CCFF00] ${FOCUS_RING}`;

export const compactControlClass =
  `w-full bg-[#0A0A0A] border border-[#444] px-2 py-1.5 text-xs text-white font-mono transition-colors ` +
  `hover:border-[#666] focus:border-[#CCFF00] ${FOCUS_RING}`;

/** Selects carry the accent of the panel they belong to. */
export function selectControlClass(accent: 'lime' | 'fuchsia' | 'red'): string {
  const border = {
    lime: 'focus:border-[#CCFF00]',
    fuchsia: 'focus:border-fuchsia-400',
    red: 'focus:border-[#FF4444]',
  }[accent];
  const text = {
    lime: 'text-[#CCFF00]',
    fuchsia: 'text-fuchsia-400',
    red: 'text-white',
  }[accent];

  return (
    `w-full bg-[#1A1A1A] border border-[#444] px-3 py-2 font-mono ${text} appearance-none ` +
    `transition-colors hover:border-[#666] ${border} ${FOCUS_RING}`
  );
}

export const buttonFocusClass = FOCUS_RING;
