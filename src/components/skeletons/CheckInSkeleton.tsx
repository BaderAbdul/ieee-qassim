import React from 'react';
import { Skeleton } from './Skeleton';

export function CheckInSkeleton() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center border border-gray-100 shadow-xl shadow-blue-900/5 space-y-6 animate-pulse">
        <Skeleton className="h-20 w-20 rounded-full mx-auto" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 mx-auto rounded-xl" />
          <Skeleton className="h-4 w-64 mx-auto rounded-md" />
        </div>
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}

export default CheckInSkeleton;
