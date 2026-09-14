'use client';

import { useEffect, useState, use } from 'react';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, functions } from '@/lib/firebase/client';
import { httpsCallable } from 'firebase/functions';
import { PlatformEvent } from '@/lib/types';
import { Link } from '@/i18n/routing';
import { ArrowRight, Users, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function AdminQRDisplayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = use(params);
  
  const [event, setEvent] = useState<PlatformEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkInCount, setCheckInCount] = useState(0);
  const [token, setToken] = useState<string | null>(null);

  // Rotate token every 45 seconds (token expires in 60s) via Callable Function
  useEffect(() => {
    if (!event || event.state !== 'Ongoing') return;
    
    let isMounted = true;
    
    const fetchToken = async () => {
      try {
        const generateCheckInToken = httpsCallable(functions, 'generateCheckInToken');
        const result = await generateCheckInToken({ eventId });
        if (isMounted) {
          setToken((result.data as any).token);
        }
      } catch (error) {
        console.error("Error generating token", error);
      }
    };

    fetchToken();
    const interval = setInterval(fetchToken, 45000);
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [eventId, event]);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const eventSnap = await getDoc(doc(db, 'events', eventId));
        if (eventSnap.exists()) {
          setEvent({ id: eventSnap.id, ...eventSnap.data() } as PlatformEvent);
        }
      } catch (error) {
        console.error("Error fetching event", error);
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [eventId]);

  // Real-time listener for check-ins
  useEffect(() => {
    if (!eventId) return;
    const q = query(collection(db, 'attendance_logs'), where('eventId', '==', eventId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCheckInCount(snapshot.size);
    });
    return () => unsubscribe();
  }, [eventId]);

  if (loading) {
    return <div className="py-20 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>;
  }

  if (!event || event.state !== 'Ongoing') {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold text-gray-900 mb-2">الفعالية غير متاحة لتسجيل الحضور</h2>
        <p className="text-gray-500 mb-4">يجب أن تكون حالة الفعالية "Ongoing" لعرض رمز QR.</p>
        <Link href="/admin/check-in" className="text-purple-600 hover:underline">العودة لقائمة تسجيل الحضور</Link>
      </div>
    );
  }

  // Generate the check-in URL that students will scan
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const checkInUrl = `${baseUrl}/check-in/${eventId}?token=${token}`;

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden text-center">
        
        {/* Header */}
        <div className="bg-purple-900 text-white p-6 relative">
          <Link href="/admin/check-in" className="absolute top-6 start-6 text-purple-200 hover:text-white">
            <ArrowRight className="h-6 w-6 rtl:-scale-x-100" />
          </Link>
          <h1 className="text-2xl md:text-4xl font-bold font-cairo mb-2">{event.title}</h1>
          <p className="text-purple-200 text-lg">امسح الرمز أدناه لتسجيل الحضور</p>
        </div>

        {/* QR Code Area */}
        <div className="p-12 flex flex-col items-center">
          {token ? (
            <div className="bg-white p-4 rounded-3xl shadow-md border-4 border-purple-100 mb-8 inline-block">
              <QRCodeSVG 
                value={checkInUrl} 
                size={300}
                level="H"
                includeMargin={true}
              />
            </div>
          ) : (
            <div className="h-[300px] w-[300px] flex items-center justify-center bg-gray-100 rounded-3xl mb-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          )}
          
          <div className="flex items-center text-gray-500 bg-gray-50 px-6 py-3 rounded-full">
            <div className="animate-pulse h-2 w-2 bg-green-500 rounded-full me-2"></div>
            يتم تحديث الرمز التلقائياً لمنع التلاعب
          </div>
        </div>

        {/* Footer Stats */}
        <div className="bg-gray-50 border-t border-gray-100 p-6 flex justify-center items-center gap-8">
          <div className="text-center">
            <p className="text-sm text-gray-500 font-medium mb-1">الحضور المسجل</p>
            <div className="flex items-center justify-center text-3xl font-bold text-gray-900 font-cairo">
              <Users className="h-6 w-6 text-purple-600 me-2" />
              {checkInCount}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
