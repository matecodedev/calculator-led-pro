import type { ReactNode } from 'react';

interface SectionHeadingProps {
  children: ReactNode;
  icon?: ReactNode;
  /** Right-aligned reference text, e.g. the selected cabinet model. */
  note?: ReactNode;
  accent?: 'lime' | 'blue' | 'fuchsia' | 'red';
  className?: string;
}

const ACCENT = {
  lime: 'text-[#CCFF00]',
  blue: 'text-blue-400',
  fuchsia: 'text-fuchsia-400',
  red: 'text-[#FF4444]',
} as const;

export default function SectionHeading({
  children,
  icon,
  note,
  accent = 'lime',
  className = 'mb-4',
}: SectionHeadingProps) {
  return (
    <div className={`flex justify-between items-end gap-3 ${className}`}>
      <h2
        className={`text-xs font-bold tracking-widest uppercase flex items-center gap-2 ${ACCENT[accent]}`}
      >
        {icon}
        {children}
      </h2>
      {note}
    </div>
  );
}
