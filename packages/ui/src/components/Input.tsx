import * as React from 'react';
import { cn } from '../utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
}

export const Input: React.FC<InputProps> = ({ 
  label, 
  error, 
  helperText,
  leftIcon,
  rightIcon,
  className, 
  containerClassName,
  id,
  ...props 
}) => {
  const inputId = id || React.useId();
  
  return (
    <div className={cn("flex flex-col gap-1.5 w-full", containerClassName)}>
      {label && (
        <label 
          htmlFor={inputId} 
          className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1"
        >
          {label}
        </label>
      )}
      <div className="relative group">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
            {leftIcon}
          </div>
        )}
        <input
          id={inputId}
          className={cn(
            "flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-all",
            "file:border-0 file:bg-transparent file:text-sm file:font-medium",
            "placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-500",
            "disabled:cursor-not-allowed disabled:opacity-50",
            leftIcon && "pl-10",
            rightIcon && "pr-10",
            error && "border-rose-500 focus-visible:ring-rose-500/20 focus-visible:border-rose-500",
            className
          )}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
            {rightIcon}
          </div>
        )}
      </div>
      {error && (
        <p className="text-[10px] font-bold text-rose-500 ml-1 mt-0.5 animate-in slide-in-from-top-1 duration-200">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p className="text-[10px] font-medium text-slate-400 ml-1 mt-0.5">
          {helperText}
        </p>
      )}
    </div>
  );
};
