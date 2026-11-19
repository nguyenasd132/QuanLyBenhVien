import React from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-10 px-6 rounded-2xl border border-dashed border-[#9FB5D0] bg-[#EDF3FB]',
        className
      )}
    >
      <div className="h-12 w-12 rounded-2xl bg-[#DCEAFB] text-[#1D5BB8] flex items-center justify-center mb-3.5 border border-[#9EC0EC]">
        {icon || <Inbox className="h-6 w-6" />}
      </div>
      <h4 className="text-sm sm:text-base font-bold text-slate-900">{title}</h4>
      {description && <p className="text-xs sm:text-sm text-slate-600 max-w-md mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};
