import React from 'react';
import { EventsGridSkeleton } from '@/components/skeletons/EventsGridSkeleton';

export default function EventsLoading() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 sm:py-16 px-4 sm:px-6 lg:px-8 mt-16">
      <div className="max-w-7xl mx-auto space-y-10">
        <EventsGridSkeleton />
      </div>
    </div>
  );
}
