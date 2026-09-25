import React from 'react';
import { cn } from './utils';

export interface BadgeProps {
  variant?:
    | 'neutral'
    | 'given'
    | 'taken'
    | 'emi'
    | 'trustGreen'
    | 'trustAmber'
    | 'trustRed'
    | 'railCash'
    | 'railUpi'
    | 'railBank'
    | 'railCheque';
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  children,
  className = '',
  size = 'sm',
}) => {
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1';

  const variantStyles = {
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
    // TAKEN = Cash Inflow / Repayment Collected / Debt Settled -> Green (Emerald)
    taken: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    // GIVEN = Capital Disbursed / Outflow / Credit Advanced -> Rose (Red)
    given: 'bg-rose-50 text-rose-800 border-rose-200',
    emi: 'bg-amber-50 text-amber-800 border-amber-200',
    trustGreen: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    trustAmber: 'bg-amber-50 text-amber-800 border-amber-200',
    trustRed: 'bg-rose-50 text-rose-800 border-rose-200',
    railCash: 'bg-amber-50 text-amber-900 border-amber-200',
    railUpi: 'bg-sky-50 text-sky-900 border-sky-200',
    railBank: 'bg-indigo-50 text-indigo-900 border-indigo-200',
    railCheque: 'bg-slate-100 text-slate-800 border-slate-200',
  }[variant];

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-md border select-none',
        sizeClasses,
        variantStyles,
        className
      )}
    >
      {children}
    </span>
  );
};
