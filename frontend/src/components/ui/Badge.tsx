import React from 'react';
import { cn } from '@/lib/cn';

export type BadgeVariant = 'blue' | 'emerald' | 'amber' | 'rose' | 'slate' | 'violet' | 'teal';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
  pulse?: boolean;
  size?: 'sm' | 'md';
}

const badgeStyles: Record<BadgeVariant, string> = {
  blue: 'bg-[#DCEAFB] text-[#15458E] border-[#9EC0EC]',
  emerald: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  amber: 'bg-amber-100 text-amber-900 border-amber-300',
  rose: 'bg-rose-100 text-rose-900 border-rose-300',
  slate: 'bg-slate-200/80 text-slate-800 border-slate-300',
  violet: 'bg-violet-100 text-violet-900 border-violet-300',
  teal: 'bg-teal-100 text-teal-900 border-teal-300',
};

const dotStyles: Record<BadgeVariant, string> = {
  blue: 'bg-[#1D5BB8]',
  emerald: 'bg-emerald-600',
  amber: 'bg-amber-600',
  rose: 'bg-rose-600',
  slate: 'bg-slate-600',
  violet: 'bg-violet-600',
  teal: 'bg-teal-600',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'blue',
  dot = false,
  pulse = false,
  size = 'md',
  className,
  children,
  ...props
}) => {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-semibold whitespace-nowrap',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        badgeStyles[variant],
        className
      )}
      {...props}
    >
      {dot && (
        <span className="relative flex h-2 w-2 shrink-0">
          {pulse && (
            <span
              className={cn(
                'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                dotStyles[variant]
              )}
            />
          )}
          <span className={cn('relative inline-flex rounded-full h-2 w-2', dotStyles[variant])} />
        </span>
      )}
      {children}
    </span>
  );
};
