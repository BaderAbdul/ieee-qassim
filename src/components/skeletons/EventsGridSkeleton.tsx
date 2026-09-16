import React from 'react';
import { Skeleton } from './Skeleton';
import { EventCardSkeleton } from './EventCardSkeleton';

export function EventsGridSkeleton() {
  return (
    <div className="space-y-8">
      {/* Filter Tabs Skeleton */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-10 w-24 rounded-full" />
          ))}
        </div>
        <Skeleton className="h-10 w-48 rounded-2xl" />
      </div>

      {/* Grid of 6 Event Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <EventCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export default EventsGridSkeleton;
