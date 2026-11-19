import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 py-8 text-slate-600', className)}>
      <Loader2 className="h-6 w-6 animate-spin text-[#1D5BB8]" />
      {label && <span className="text-xs sm:text-sm font-medium">{label}</span>}
    </div>
  );
}

export type AlertVariant = 'info' | 'success' | 'warning' | 'error';

const alertStyles: Record<AlertVariant, string> = {
  info: 'bg-[#DCEAFB] border-[#9EC0EC] text-[#113A7A]',
  success: 'bg-emerald-100/80 border-emerald-300 text-emerald-900',
  warning: 'bg-amber-100/80 border-amber-300 text-amber-900',
  error: 'bg-rose-100/80 border-rose-300 text-rose-900',
};

const alertIcons: Record<AlertVariant, React.ReactNode> = {
  info: <Info className="h-4 w-4 shrink-0 mt-0.5" />,
  success: <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />,
  warning: <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />,
  error: <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />,
};

export const Alert: React.FC<{
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ variant = 'info', title, children, className }) => {
  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-xl border px-4 py-3 text-xs sm:text-sm',
        alertStyles[variant],
        className
      )}
    >
      {alertIcons[variant]}
      <div className="min-w-0 flex-1">
        {title && <p className="font-bold mb-0.5">{title}</p>}
        <div>{children}</div>
      </div>
    </div>
  );
};

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

export const Tabs: React.FC<{
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  variant?: 'pill' | 'underline';
  className?: string;
}> = ({ items, activeId, onChange, variant = 'pill', className }) => {
  if (variant === 'underline') {
    return (
      <div className={cn('flex items-center gap-1 border-b border-[#C7D6EA] overflow-x-auto', className)}>
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap',
                active
                  ? 'border-[#1D5BB8] text-[#1D5BB8]'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              )}
            >
              {item.icon}
              <span>{item.label}</span>
              {typeof item.count === 'number' && (
                <span
                  className={cn(
                    'px-1.5 py-0.5 text-[11px] rounded-full font-bold',
                    active ? 'bg-[#DCEAFB] text-[#15458E]' : 'bg-slate-200 text-slate-700'
                  )}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'inline-flex flex-wrap items-center gap-1 p-1 rounded-xl bg-[#E8F0FA] border border-[#C7D6EA]',
        className
      )}
    >
      {items.map((item) => {
        const active = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap',
              active
                ? 'bg-white text-[#15458E] shadow-sm border border-[#9EC0EC]'
                : 'text-slate-700 hover:text-slate-900'
            )}
          >
            {item.icon}
            <span>{item.label}</span>
            {typeof item.count === 'number' && (
              <span
                className={cn(
                  'px-1.5 py-0.5 text-[11px] rounded-full font-bold',
                  active ? 'bg-[#DCEAFB] text-[#15458E]' : 'bg-white text-slate-700'
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
