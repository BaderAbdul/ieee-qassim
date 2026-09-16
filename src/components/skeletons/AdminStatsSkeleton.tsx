import React from 'react';
import { Skeleton } from './Skeleton';

export function AdminStatsSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-9 w-40 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 flex items-center gap-4 shadow-xs">
            <Skeleton className="h-16 w-16 rounded-xl flex-shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl p-8 border border-gray-100 space-y-6 shadow-xs">
          <Skeleton className="h-7 w-48" />
          <div className="space-y-4">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        </div>
        <div className="bg-white rounded-2xl p-8 border border-gray-100 space-y-6 shadow-xs">
          <Skeleton className="h-7 w-52" />
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-10 w-40 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export default AdminStatsSkeleton;
