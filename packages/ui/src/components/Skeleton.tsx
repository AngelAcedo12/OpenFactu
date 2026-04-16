import React from 'react';

interface SkeletonProps {
  className?: string;
  count?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = 'h-4 bg-slate-200 dark:bg-slate-800 rounded',
  count = 1,
}) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`${className} animate-pulse`} />
      ))}
    </>
  );
};

export const SkeletonCard: React.FC<{ count?: number }> = ({ count = 1 }) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 space-y-4"
      >
        <Skeleton className="h-6 w-2/3" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>
    ))}
  </>
);

export const DashboardSkeleton: React.FC = () => (
  <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
    {/* Header */}
    <div className="space-y-2">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96" />
    </div>

    {/* KPI Cards Grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="p-6 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 space-y-4"
        >
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-8 w-40" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      ))}
    </div>

    {/* Content Grid */}
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column */}
      <div className="lg:col-span-8 space-y-6">
        {/* Recent Documents Card */}
        <div className="p-6 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 space-y-4">
          <Skeleton className="h-6 w-48" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-8 w-8 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>

        {/* Stock Alerts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="p-6 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 space-y-4"
            >
              <Skeleton className="h-6 w-40" />
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="flex justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Column */}
      <aside className="lg:col-span-4 space-y-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="p-6 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 space-y-4"
          >
            <Skeleton className="h-6 w-40" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="flex gap-3">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-40" />
                  </div>
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </aside>
    </div>
  </div>
);
