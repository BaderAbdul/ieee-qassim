import React from 'react';
import { Skeleton } from './Skeleton';

export function EventDetailsSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 pb-20 pt-24 sm:pt-32" role="status" aria-label="Loading event">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Skeleton className="h-10 w-40 rounded-xl mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12">
          <div className="lg:col-span-5">
            <div className="rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden border-4 sm:border-8 border-white">
              <Skeleton className="aspect-[3/4] w-full rounded-none" />
            </div>
          </div>
          <div className="lg:col-span-7 space-y-6">
            <Skeleton className="h-7 w-28 rounded-full" />
            <Skeleton className="h-14 w-4/5" />
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(id => <Skeleton key={id} className="h-20 rounded-2xl" />)}
            </div>
            <div className="bg-white rounded-3xl p-6 sm:p-8 space-y-4">
              <Skeleton className="h-7 w-36" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-14 w-full rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default EventDetailsSkeleton;
