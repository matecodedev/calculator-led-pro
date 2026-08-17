import { useId, type ReactNode } from 'react';

export interface Segment<T extends string> {
  value: T;
  label: ReactNode;
}

interface SegmentedControlProps<T extends string> {
  label: string;
  segments: readonly Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  /** 'solid' fills the selected segment with the accent; 'subtle' greys it. */
  variant?: 'solid' | 'subtle';
  accent?: 'lime' | 'red';
  className?: string;
}

const SELECTED = {
  solid: { lime: 'bg-[#CCFF00] text-black', red: 'bg-[#FF4444] text-white' },
  subtle: { lime: 'bg-[#333] text-white', red: 'bg-[#333] text-white' },
} as const;

/**
 * A group of mutually exclusive options. Rendered as radios so arrow keys move
 * between them and the selected one is announced as such.
 */
export default function SegmentedControl<T extends string>({
  label,
  segments,
  value,
  onChange,
  variant = 'solid',
  accent = 'lime',
  className = '',
}: SegmentedControlProps<T>) {
  const name = useId();

  return (
    <fieldset className={className}>
      <legend className="block text-[11px] uppercase tracking-wide text-neutral-400 mb-1">
        {label}
      </legend>
      <div className="flex gap-1 bg-[#1A1A1A] border border-[#444] rounded-sm p-1">
        {segments.map((segment) => {
          const selected = segment.value === value;
          return (
            <label
              key={segment.value}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-1.5 text-[11px] uppercase font-bold tracking-wider rounded-sm cursor-pointer transition-colors ${
                selected
                  ? SELECTED[variant][accent]
                  : 'text-neutral-400 hover:text-white hover:bg-[#222]'
              } has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[#CCFF00]`}
            >
              <input
                type="radio"
                name={name}
                value={segment.value}
                checked={selected}
                onChange={() => onChange(segment.value)}
                className="sr-only"
              />
              {segment.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
