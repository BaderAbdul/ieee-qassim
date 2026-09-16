import React from 'react';
import { Skeleton } from './Skeleton';

export function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8 mt-16">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Digital Member Card Skeleton */}
        <div className="bg-slate-900 rounded-[2.5rem] p-6 sm:p-10 border border-white/10 flex flex-col md:flex-row justify-between items-center gap-8 animate-pulse shadow-xl shadow-slate-950/10">
          <div className="flex flex-col md:flex-row items-center gap-6 flex-1 w-full md:w-auto">
            <Skeleton className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-slate-800 flex-shrink-0" />
            <div className="space-y-3 text-center md:text-start flex-1">
              <Skeleton className="h-4 w-28 bg-slate-800 mx-auto md:mx-0" />
              <Skeleton className="h-8 w-48 bg-slate-800 mx-auto md:mx-0" />
              <Skeleton className="h-4 w-36 bg-slate-800 mx-auto md:mx-0" />
              <div className="flex gap-2 justify-center md:justify-start pt-2">
                <Skeleton className="h-9 w-24 rounded-xl bg-slate-800" />
                <Skeleton className="h-9 w-24 rounded-xl bg-slate-800" />
              </div>
            </div>
          </div>
          <Skeleton className="w-36 h-36 rounded-3xl bg-slate-800 flex-shrink-0" />
        </div>

        {/* 4 Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-3xl p-6 border border-gray-100 flex items-center gap-4 shadow-xs">
              <Skeleton className="h-14 w-14 rounded-2xl flex-shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-7 w-20" />
              </div>
            </div>
          ))}
        </div>

        {/* Badges Row */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 space-y-4 shadow-xs">
          <Skeleton className="h-6 w-44" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-36 rounded-2xl" />
            ))}
          </div>
        </div>

        {/* Tabs & Items */}
        <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden p-6 space-y-4 shadow-xs">
          <div className="flex gap-4 border-b border-gray-100 pb-4">
            <Skeleton className="h-10 flex-1 rounded-xl" />
            <Skeleton className="h-10 flex-1 rounded-xl" />
            <Skeleton className="h-10 flex-1 rounded-xl" />
          </div>
          <div className="space-y-3 pt-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfileSkeleton;
