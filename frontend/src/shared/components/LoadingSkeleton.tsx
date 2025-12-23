import React from 'react';

export default function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-neutral-200 dark:bg-neutral-700 rounded w-1/4"></div>
      <div className="space-y-3">
        <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
        <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-5/6"></div>
        <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-4/6"></div>
      </div>
    </div>
  );
}
