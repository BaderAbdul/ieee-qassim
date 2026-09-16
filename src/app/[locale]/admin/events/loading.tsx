import React from 'react';
import { AdminTableSkeleton } from '@/components/skeletons/AdminTableSkeleton';

export default function AdminEventsLoading() {
  return (
    <div className="space-y-6">
      <AdminTableSkeleton rows={6} />
    </div>
  );
}
