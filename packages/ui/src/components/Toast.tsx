import * as React from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '../utils';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastProps {
  id: string;
  message: string;
  type?: ToastType;
  onClose: (id: string) => void;
}

/**
 * Componente Toast individual para notificaciones.
 * Diseñado con estética limpia y moderna.
 */
export const Toast: React.FC<ToastProps> = ({ id, message, type = 'info', onClose }) => {
  const icons = {
    success: <CheckCircle className="text-emerald-600" size={20} />,
    error: <AlertCircle className="text-rose-600" size={20} />,
    info: <Info className="text-blue-600" size={20} />,
    warning: <AlertTriangle className="text-amber-600" size={20} />,
  };

  const borderClasses = {
    success: 'border-emerald-200 dark:border-emerald-500/30 bg-white/90 dark:bg-slate-900/90 shadow-emerald-500/5',
    error:   'border-rose-200 dark:border-rose-500/30 bg-white/90 dark:bg-slate-900/90 shadow-rose-500/5',
    info:    'border-blue-200 dark:border-blue-500/30 bg-white/90 dark:bg-slate-900/90 shadow-blue-500/5',
    warning: 'border-amber-200 dark:border-amber-500/30 bg-white/90 dark:bg-slate-900/90 shadow-amber-500/5',
  };

  React.useEffect(() => {
    const timer = setTimeout(() => onClose(id), 5000);
    return () => clearTimeout(timer);
  }, [id, onClose]);

  return (
    <div className={cn(
      "pointer-events-auto flex w-full max-w-sm items-center gap-4 rounded-2xl border p-4 shadow-xl backdrop-blur-md transition-all animate-in slide-in-from-right-8 fade-in-0 duration-500",
      borderClasses[type]
    )}>
      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center border border-slate-100 dark:border-slate-700 shadow-inner">
        {icons[type]}
      </div>
      <div className="flex-1 text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight">
        {message}
      </div>
      <button
        onClick={() => onClose(id)}
        className="flex-shrink-0 rounded-xl p-2 text-slate-300 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
      >
        <X size={16} />
      </button>
    </div>
  );
};
