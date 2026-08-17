import type { ReactNode } from 'react';

interface StatTileProps {
  label: string;
  value: ReactNode;
  /** Small print under the value: capacities, per-unit figures, warnings. */
  footnote?: ReactNode;
  tone?: 'neutral' | 'data' | 'power' | 'alert';
  className?: string;
}

const VALUE_TONE = {
  neutral: 'text-white',
  data: 'text-fuchsia-400',
  power: 'text-amber-400',
  alert: 'text-[#FF4444]',
} as const;

/**
 * One headline number with its label. `tabular-nums` keeps the figures from
 * shifting as values change.
 */
export default function StatTile({
  label,
  value,
  footnote,
  tone = 'neutral',
  className = 'bg-[#161616] border-[#333]',
}: StatTileProps) {
  return (
    <div className={`p-3 border flex flex-col justify-center ${className}`}>
      <div className="text-[11px] uppercase tracking-wide text-neutral-400">{label}</div>
      <div className={`text-xl sm:text-2xl font-mono tabular-nums ${VALUE_TONE[tone]}`}>
        {value}
      </div>
      {footnote && <div className="text-[11px] text-neutral-400 mt-1">{footnote}</div>}
    </div>
  );
}
