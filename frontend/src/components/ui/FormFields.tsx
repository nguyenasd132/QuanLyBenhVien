import React from 'react';
import { cn } from '@/lib/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightElement, className, id, ...props }, ref) => {
    const inputId = id || props.name;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-xs sm:text-sm font-semibold text-slate-800 mb-1.5">
            {label}
            {props.required && <span className="text-rose-600 ml-0.5">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <span className="absolute left-3.5 text-slate-500 pointer-events-none flex items-center">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full h-10 rounded-xl border bg-white text-sm text-slate-900 placeholder:text-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-[#1D5BB8]/25',
              error
                ? 'border-rose-400 focus:border-rose-600 focus:ring-rose-500/25'
                : 'border-[#9FB5D0] hover:border-[#7B99BE] focus:border-[#1D5BB8]',
              leftIcon ? 'pl-10' : 'px-3.5',
              rightElement ? 'pr-10' : 'pr-3.5',
              className
            )}
            {...props}
          />
          {rightElement && <span className="absolute right-3 flex items-center">{rightElement}</span>}
        </div>
        {error && <p className="text-xs font-medium text-rose-600 mt-1">{error}</p>}
        {!error && hint && <p className="text-xs text-slate-600 mt-1">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options?: SelectOption[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, children, className, id, ...props }, ref) => {
    const selectId = id || props.name;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="block text-xs sm:text-sm font-semibold text-slate-800 mb-1.5">
            {label}
            {props.required && <span className="text-rose-600 ml-0.5">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            'w-full h-10 px-3.5 rounded-xl border bg-white text-sm text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-[#1D5BB8]/25',
            error
              ? 'border-rose-400 focus:border-rose-600 focus:ring-rose-500/25'
              : 'border-[#9FB5D0] hover:border-[#7B99BE] focus:border-[#1D5BB8]',
            className
          )}
          {...props}
        >
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        {error && <p className="text-xs font-medium text-rose-600 mt-1">{error}</p>}
        {!error && hint && <p className="text-xs text-slate-600 mt-1">{hint}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const textareaId = id || props.name;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className="block text-xs sm:text-sm font-semibold text-slate-800 mb-1.5">
            {label}
            {props.required && <span className="text-rose-600 ml-0.5">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            'w-full min-h-[88px] px-3.5 py-2.5 rounded-xl border bg-white text-sm text-slate-900 placeholder:text-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-[#1D5BB8]/25',
            error
              ? 'border-rose-400 focus:border-rose-600 focus:ring-rose-500/25'
              : 'border-[#9FB5D0] hover:border-[#7B99BE] focus:border-[#1D5BB8]',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs font-medium text-rose-600 mt-1">{error}</p>}
        {!error && hint && <p className="text-xs text-slate-600 mt-1">{hint}</p>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';
