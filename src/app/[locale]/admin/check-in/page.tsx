'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { PlatformEvent } from '@/lib/types';
import { Link } from '@/i18n/routing';
import { QrCode } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export default function AdminCheckInDashboard() {
  const [events, setEvents] = useState<PlatformEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const q = query(collection(db, 'events'), where('state', '==', 'Ongoing'));
        const snap = await getDocs(q);
        const fetchedEvents = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PlatformEvent[];
        setEvents(fetchedEvents);
      } catch (error) {
        console.error("Error fetching ongoing events", error);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  if (loading) {
    return <div className="py-20 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 font-cairo mb-2">تسجيل الحضور</h1>
        <p className="text-gray-600">اختر فعالية جارية لعرض رمز الاستجابة السريعة (QR Code) لتسجيل حضور الطلاب.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-6">
        <h2 className="text-xl font-bold font-cairo mb-4 border-b border-gray-100 pb-2">الفعاليات الجارية الآن</h2>
        
        {events.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <QrCode className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <p className="text-lg">لا توجد فعاليات في حالة &quot;Ongoing&quot; حالياً.</p>
            <p className="text-sm mt-2">لتسجيل الحضور، قم بتغيير حالة الفعالية إلى Ongoing من لوحة إدارة الفعاليات.</p>
            <Link href="/admin/events" className="inline-block mt-4 text-purple-600 font-medium hover:underline">
              الذهاب لإدارة الفعاليات
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map(event => {
              const eventDate = event.date instanceof Date ? event.date : (event.date as { toDate?: () => Date })?.toDate?.() || new Date();
              return (
                <div key={event.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-bold text-lg line-clamp-2">{event.title}</h3>
                    <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded">جارية</span>
                  </div>
                  <p className="text-sm text-gray-500 mb-6">
                    {format(eventDate, 'dd MMM yyyy', { locale: ar })}
                  </p>
                  <Link 
                    href={`/admin/events/${event.id}/qr`}
                    className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center justify-center"
                  >
                    <QrCode className="me-2 h-5 w-5" />
                    عرض QR Code
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
