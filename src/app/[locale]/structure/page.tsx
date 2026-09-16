import React from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import StructureAccordion, { Committee } from './StructureAccordion';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function StructurePage({ params }: { params: Promise<{ locale: string }> }) {
  const resolvedParams = await params;
  const isAr = resolvedParams.locale === 'ar';
  
  let committees: Committee[] = [];
  try {
    const docSnap = await getDoc(doc(db, 'settings', 'homepage'));
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data && data.committees) {
        committees = data.committees;
      }
    }
  } catch (err) {
    console.error("Error fetching structure", err);
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-28 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 font-thmanyah uppercase tracking-tight">
            {isAr ? 'الهيكلة الإدارية' : 'Organizational Structure'}
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto font-medium">
            {isAr 
              ? 'تعرف على اللجان وفرق العمل التي تقود مبادرات وفعاليات النادي.' 
              : 'Meet the committees and teams driving the club initiatives and events.'}
          </p>
        </div>

        <StructureAccordion committees={committees} isAr={isAr} />

      </div>
    </div>
  );
}
