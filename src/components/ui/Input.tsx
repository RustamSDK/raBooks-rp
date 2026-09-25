import React from 'react';
import { cn } from './utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
  prefixSymbol?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helper, prefixSymbol, className = '', id, 'aria-describedby': ariaDescribedBy, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : generatedId);
    const errorId = error ? `${inputId}-error` : undefined;
    const helperId = helper ? `${inputId}-helper` : undefined;

    const combinedDescribedBy = [errorId, helperId, ariaDescribedBy].filter(Boolean).join(' ') || undefined;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-slate-700 mb-1">
            {label}
          </label>
        )}
        <div className="relative">
          {prefixSymbol && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 font-medium sm:text-sm">
              {prefixSymbol}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            aria-invalid={!!error}
            aria-describedby={combinedDescribedBy}
            className={cn(
              'block w-full rounded-lg border text-sm transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:bg-slate-50 disabled:text-slate-500',
              prefixSymbol ? 'pl-8' : 'pl-3',
              'pr-3 py-2',
              error
                ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200 text-rose-900 bg-rose-50/20'
                : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-100 text-slate-900 bg-white',
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p id={errorId} role="alert" className="mt-1 text-xs text-rose-600 font-medium">
            {error}
          </p>
        )}
        {helper && !error && (
          <p id={helperId} className="mt-1 text-xs text-slate-500">
            {helper}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
