import React from 'react';
import { Skeleton } from './Skeleton';

export function LeaderboardSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col items-center space-y-4 text-center">
          <Skeleton className="h-20 w-20 rounded-3xl" />
          <Skeleton className="h-10 w-48 rounded-xl" />
          <Skeleton className="h-5 w-96 max-w-full rounded-lg" />
        </div>

        {/* User Rows */}
        <div className="bg-white rounded-3xl border border-gray-100 divide-y divide-gray-100 overflow-hidden shadow-xs">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="p-4 sm:p-6 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                <Skeleton className="h-12 w-12 rounded-2xl flex-shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <div className="text-end space-y-1">
                <Skeleton className="h-6 w-16 ms-auto" />
                <Skeleton className="h-3 w-10 ms-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default LeaderboardSkeleton;
