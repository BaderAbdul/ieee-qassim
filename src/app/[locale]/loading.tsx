import React from 'react';
import { Skeleton } from '@/components/skeletons/Skeleton';
import { EventCardSkeleton } from '@/components/skeletons/EventCardSkeleton';

export default function RootLoading() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section Skeleton */}
      <section className="relative pt-24 sm:pt-32 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-7 space-y-6 text-center lg:text-start">
            <Skeleton className="h-8 w-48 rounded-full mx-auto lg:mx-0" />
            <Skeleton className="h-12 sm:h-16 w-3/4 rounded-2xl mx-auto lg:mx-0" />
            <Skeleton className="h-6 w-full max-w-xl rounded-xl mx-auto lg:mx-0" />
            <div className="flex gap-4 justify-center lg:justify-start pt-4">
              <Skeleton className="h-12 w-36 rounded-xl" />
              <Skeleton className="h-12 w-36 rounded-xl" />
            </div>
          </div>
          <div className="lg:col-span-5 flex justify-center">
            <Skeleton className="w-full max-w-md h-80 rounded-3xl" />
          </div>
        </div>
      </section>

      {/* Featured Events Grid Skeleton */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-4 mb-8">
          <Skeleton className="h-8 w-56 rounded-xl" />
          <Skeleton className="h-4 w-80 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <EventCardSkeleton key={i} />
          ))}
        </div>
      </section>
    </div>
  );
}
