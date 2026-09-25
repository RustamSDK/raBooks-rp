import React from 'react';
import { cn } from './utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'amber' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  icon,
  loading = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 select-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1 rounded-md gap-1.5 h-8',
    md: 'text-sm px-3.5 py-1.5 rounded-lg gap-2 h-9',
    lg: 'text-base px-4 py-2 rounded-lg gap-2.5 h-11',
  }[size];

  const variantClasses = {
    primary:
      'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-2xs focus-visible:ring-indigo-500 border border-transparent',
    secondary:
      'bg-slate-900 hover:bg-slate-800 active:bg-black text-white shadow-2xs focus-visible:ring-slate-700 border border-transparent',
    success:
      'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-2xs focus-visible:ring-emerald-500 border border-transparent',
    danger:
      'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-2xs focus-visible:ring-rose-500 border border-transparent',
    amber:
      'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white shadow-2xs focus-visible:ring-amber-500 border border-transparent',
    outline:
      'bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 border border-slate-300 shadow-2xs focus-visible:ring-slate-400',
    ghost:
      'bg-transparent hover:bg-slate-100 active:bg-slate-200 text-slate-700 focus-visible:ring-slate-300',
  }[variant];

  return (
    <button
      className={cn(baseClasses, sizeClasses, variantClasses, className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span
          className="inline-block size-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0"
          aria-hidden="true"
        />
      ) : (
        icon && <span className="shrink-0" aria-hidden="true">{icon}</span>
      )}
      {children}
    </button>
  );
};
