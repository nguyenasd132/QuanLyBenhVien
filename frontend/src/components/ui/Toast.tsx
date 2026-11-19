import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/cn';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

interface ToastContextValue {
  showToast: (toast: Omit<ToastItem, 'id'>) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const toastColors: Record<ToastType, string> = {
  success: 'bg-white border-emerald-300 text-slate-900',
  error: 'bg-white border-rose-300 text-slate-900',
  info: 'bg-white border-[#9EC0EC] text-slate-900',
  warning: 'bg-white border-amber-300 text-slate-900',
};

const toastIcons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />,
  error: <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />,
  info: <Info className="h-5 w-5 text-[#1D5BB8] shrink-0" />,
  warning: <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />,
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: Omit<ToastItem, 'id'>) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-3), { ...toast, id }]);
      setTimeout(() => removeToast(id), 4500);
    },
    [removeToast]
  );

  const success = useCallback(
    (title: string, description?: string) => showToast({ type: 'success', title, description }),
    [showToast]
  );
  const error = useCallback(
    (title: string, description?: string) => showToast({ type: 'error', title, description }),
    [showToast]
  );
  const info = useCallback(
    (title: string, description?: string) => showToast({ type: 'info', title, description }),
    [showToast]
  );
  const warning = useCallback(
    (title: string, description?: string) => showToast({ type: 'warning', title, description }),
    [showToast]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast,
      success,
      error,
      info,
      warning,
    }),
    [showToast, success, error, info, warning]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2.5 w-[calc(100%-2rem)] max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border shadow-lg transition-all',
              toastColors[t.type]
            )}
          >
            {toastIcons[t.type]}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900">{t.title}</p>
              {t.description && <p className="text-xs text-slate-700 mt-0.5">{t.description}</p>}
            </div>
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="text-slate-600 hover:text-slate-900 p-0.5 rounded-lg"
              aria-label="Đóng thông báo"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}
