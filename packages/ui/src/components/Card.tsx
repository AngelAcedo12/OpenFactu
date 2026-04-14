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
  noPadding = false 
}: CardProps) => {
  return (
    <div className={cn(
      "bg-white border border-slate-200/60 shadow-sm rounded-xl overflow-hidden",
      "ring-1 ring-slate-900/5",
      className
    )}>
      {(title || subtitle || headerAction) && (
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/30">
          <div>
            {title && (
              <h3 className="text-sm font-bold text-slate-900 font-display tracking-tight">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-[11px] font-medium text-slate-500 mt-0.5 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
          {headerAction && (
            <div className="flex-shrink-0">
              {headerAction}
            </div>
          )}
        </div>
      )}
      
      <div className={cn(
        !noPadding && "p-6",
        bodyClassName
      )}>
        {children}
      </div>

      {footer && (
        <div className="px-6 py-3 bg-slate-50/50 border-t border-slate-100 mt-auto">
          {footer}
        </div>
      )}
    </div>
  );
};
