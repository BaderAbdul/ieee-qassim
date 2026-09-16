import React from 'react';
import IdeasClient from './IdeasClient';

export const dynamic = 'force-dynamic';

export default function IdeasPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 sm:py-16 px-4 sm:px-6 lg:px-8 mt-16">
      <div className="max-w-4xl mx-auto space-y-10">
        <IdeasClient />
      </div>
    </div>
  );
}
