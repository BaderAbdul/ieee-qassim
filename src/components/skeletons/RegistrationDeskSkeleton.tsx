import React from 'react';
import { Skeleton } from './Skeleton';

export function RegistrationDeskSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-2">
          <Skeleton className="h-9 w-52" />
          <Skeleton className="h-5 w-72" />
        </div>
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>

      {/* 3 Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl p-6 border border-gray-100 flex items-center gap-4 shadow-xs">
            <Skeleton className="h-12 w-12 rounded-lg flex-shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-16" />
            </div>
          </div>
        ))}
      </div>

      {/* Table Skeleton */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-xs p-6 space-y-4">
        <div className="flex justify-between items-center pb-4 border-b border-gray-100">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-9 w-64 rounded-xl" />
        </div>
        <div className="divide-y divide-gray-100">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                <Skeleton className="h-5 w-5 rounded-sm" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default RegistrationDeskSkeleton;
