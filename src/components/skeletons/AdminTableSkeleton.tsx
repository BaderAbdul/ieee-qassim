import React from 'react';
import { Skeleton } from './Skeleton';

export function AdminTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-xs p-6 space-y-4">
      {/* Table Top Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-100">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-10 w-full sm:w-64 rounded-xl" />
      </div>

      {/* Table Rows */}
      <div className="divide-y divide-gray-100">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <Skeleton className="h-10 w-10 rounded-xl flex-shrink-0" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-3 w-32" />
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
  );
}

export default AdminTableSkeleton;
