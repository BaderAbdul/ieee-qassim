import React from 'react';
import { Skeleton } from './Skeleton';

export function EventCardSkeleton() {
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden h-full flex flex-col">
      {/* Banner */}
      <div className="h-48 w-full relative bg-slate-200 animate-pulse flex-shrink-0">
        <div className="absolute top-4 end-4">
          <Skeleton className="h-6 w-24 rounded-full bg-slate-300" />
        </div>
        <div className="absolute bottom-4 start-4 space-y-2">
          <Skeleton className="h-4 w-16 rounded bg-slate-300" />
          <Skeleton className="h-6 w-48 rounded bg-slate-300" />
        </div>
      </div>

      {/* Body */}
      <div className="p-6 flex flex-col flex-grow space-y-4">
        <div className="space-y-2 flex-grow">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>

        {/* Metadata Rows */}
        <div className="space-y-2.5 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-36" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-44" />
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-50">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default EventCardSkeleton;
