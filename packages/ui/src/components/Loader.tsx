import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../utils';

export interface LoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'primary' | 'white' | 'neutral';
  label?: string;
  overlay?: boolean;
}

/**
 * Componente Loader profesional y flexible.
 * Envuelve el spinner básico con opciones de tamaño, color y overlay.
 */
export const Loader = React.forwardRef<HTMLDivElement, LoaderProps>(
  ({ className, size = 'md', variant = 'primary', label, overlay, ...props }, ref) => {
    const sizeClasses = {
      sm: 'w-4 h-4',
      md: 'w-6 h-6',
      lg: 'w-10 h-10',
      xl: 'w-16 h-16'
    };

    const variantClasses = {
      primary: 'text-blue-600',
      white: 'text-white',
      neutral: 'text-slate-400'
    };

    const loaderContent = (
      <div 
        ref={ref} 
        className={cn('flex flex-col items-center justify-center gap-3', className)} 
        {...props}
      >
        <div className="relative">
            <Loader2 className={cn('animate-spin', sizeClasses[size], variantClasses[variant])} />
            {size === 'xl' && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
                </div>
            )}
        </div>
        {label && (
            <span className={cn(
                "text-sm font-bold tracking-tight animate-pulse",
                variant === 'white' ? 'text-white' : 'text-slate-600'
            )}>
                {label}
            </span>
        )}
      </div>
    );

    if (overlay) {
      return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-[2px] rounded-inherit transition-all duration-300">
          {loaderContent}
        </div>
      );
    }

    return loaderContent;
  }
);

Loader.displayName = 'Loader';
