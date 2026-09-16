import React from 'react';
import { CheckInSkeleton } from '@/components/skeletons/CheckInSkeleton';

export default function CheckInLoading() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <CheckInSkeleton />
    </div>
  );
}
