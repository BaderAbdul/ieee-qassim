import React from 'react';
import { Skeleton } from './Skeleton';

export function EventDetailsSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 pb-20 pt-24">
      {/* Hero Banner */}
      <div className="w-full h-72 sm:h-96 bg-slate-800 relative animate-pulse flex flex-col justify-end">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10 w-full space-y-4">
          <Skeleton className="h-6 w-32 rounded-full bg-slate-700" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20 rounded-full bg-slate-700" />
            <Skeleton className="h-5 w-24 rounded-full bg-slate-700" />
          </div>
          <Skeleton className="h-10 sm:h-14 w-3/4 rounded-xl bg-slate-700" />
        </div>
      </div>

      {/* Main Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Main Content (2 cols) */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 space-y-4 shadow-xs">
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 space-y-4 shadow-xs">
              <Skeleton className="h-8 w-48" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-2xl" />
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar / Sticky Actions */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 space-y-6 shadow-xs">
              <div className="space-y-5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3.5">
                    <Skeleton className="h-10 w-10 rounded-2xl flex-shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                ))}
              </div>
              <Skeleton className="h-14 w-full rounded-2xl mt-6" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EventDetailsSkeleton;
