'use client';

import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export const useToast = () => useContext(ToastContext);

const STYLES: Record<ToastType, { box: string; icon: React.ReactNode }> = {
  success: { box: 'border-emerald-200 bg-emerald-50 text-emerald-900', icon: <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" /> },
  error: { box: 'border-red-200 bg-red-50 text-red-900', icon: <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" /> },
  info: { box: 'border-blue-200 bg-blue-50 text-blue-900', icon: <Info className="h-5 w-5 text-blue-600 shrink-0" /> },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts(current => current.filter(toast => toast.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++nextId.current;
    setToasts(current => [...current, { id, type, message }]);
    setTimeout(() => dismiss(id), 5000);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Floating action-feedback rectangles: bottom-left on desktop, top-right on mobile. */}
      <div
        role="status"
        aria-live="polite"
        className="fixed z-[200] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm
          top-4 right-4 sm:top-auto sm:right-auto sm:bottom-4 sm:left-4"
      >
        {toasts.map(toast => (
          <div
            key={toast.id}
            dir="auto"
            className={`flex items-start gap-2 rounded-xl border p-3 shadow-lg text-sm font-medium animate-in fade-in slide-in-from-top-2 sm:slide-in-from-bottom-2 ${STYLES[toast.type].box}`}
          >
            {STYLES[toast.type].icon}
            <p className="flex-1 min-w-0">{toast.message}</p>
            <button type="button" onClick={() => dismiss(toast.id)} className="shrink-0 opacity-60 hover:opacity-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
