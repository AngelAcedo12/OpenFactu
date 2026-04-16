import * as React from 'react';
import { cn } from '../utils';

export interface CardProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  headerAction?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  noPadding?: boolean;
}

export const Card = ({
  children,
  title,
  subtitle,
  headerAction,
  footer,
  className,
  bodyClassName,
  noPadding = false,
}: CardProps) => {
  return (
    <div
      className={cn(
        'bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm dark:shadow-none rounded-xl overflow-hidden',
        'ring-1 ring-slate-900/5 dark:ring-0',
        className,
      )}
    >
      {(title || subtitle || headerAction) && (
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/30 dark:bg-slate-950/30">
          <div>
            {title && (
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-display tracking-tight">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
          {headerAction && <div className="flex-shrink-0">{headerAction}</div>}
        </div>
      )}

      <div className={cn(!noPadding && 'p-6', bodyClassName)}>{children}</div>

      {footer && (
        <div className="px-6 py-3 bg-slate-50/50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800 mt-auto">
          {footer}
        </div>
      )}
    </div>
  );
};
