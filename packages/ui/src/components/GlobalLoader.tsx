import React from 'react';

export interface GlobalLoaderProps {
  isLoading: boolean;
  message?: string;
}

export const GlobalLoader: React.FC<GlobalLoaderProps> = ({ isLoading, message }) => {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-white/80 dark:bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative flex items-center justify-center w-16 h-16 mb-4">
        <div className="absolute inset-0 border-4 border-slate-200 dark:border-slate-800 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
      </div>
      {message && (
        <p className="mt-4 text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
};
