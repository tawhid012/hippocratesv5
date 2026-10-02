"use client";

import { cn } from "@/lib/utils";

interface CasesListSkeletonProps {
  count?: number;
  className?: string;
}

export function CasesListSkeleton({ count = 4, className }: CasesListSkeletonProps) {
  const widths = ["w-3/4", "w-1/2", "w-5/6", "w-2/3", "w-4/5"];

  return (
    <div className={cn("space-y-1.5 py-1", className)} aria-label="Loading saved cases..." role="status">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex items-center justify-between gap-3 rounded-[14px] px-3.5 py-2.5 bg-white/40 dark:bg-slate-900/40 border border-slate-200/40 dark:border-slate-800/40 shadow-2xs"
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="h-4 w-4 rounded-md bg-slate-200/80 dark:bg-slate-800/80 shrink-0 animate-skeleton-shimmer" />
            <div
              className={cn(
                "h-3 rounded-md bg-slate-200/80 dark:bg-slate-800/80 animate-skeleton-shimmer",
                widths[index % widths.length]
              )}
            />
          </div>
          <div className="h-2.5 w-9 rounded-md bg-slate-200/60 dark:bg-slate-800/60 shrink-0 animate-skeleton-shimmer" />
        </div>
      ))}
    </div>
  );
}
