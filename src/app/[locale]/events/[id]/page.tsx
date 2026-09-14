'use client';

import { useEffect, useState, use } from 'react';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { db, functions } from '@/lib/firebase/client';
import { httpsCallable } from 'firebase/functions';
import { PlatformEvent } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { useLocale } from 'next-intl';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { Calendar, MapPin, Clock, Users, Trophy, Award, CheckCircle, AlertCircle } from 'lucide-react';

export default function EventDetailsPage({ params }: { params: Promise<{ id: string, locale: string }> }) {
  const unwrappedParams = use(params);
  const eventId = unwrappedParams.id;
  const locale = useLocale();
  const dateLocale = locale === 'ar' ? ar : enUS;
  
  const { user, login } = useAuth();
  
  const [event, setEvent] = useState<PlatformEvent | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [registrationStatus, setRegistrationStatus] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [attendeeCount, setAttendeeCount] = useState(0);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const docRef = doc(db, 'events', eventId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setEvent({ id: docSnap.id, ...docSnap.data() } as PlatformEvent);
          
          // Fetch current registration count
          const regQuery = query(collection(db, 'registrations'), where('eventId', '==', eventId));
          const regSnap = await getDocs(regQuery);
          // Count only active registrations (Approved or Pending or Waitlisted) - simplifying for V1
          const activeRegs = regSnap.docs.filter(d => d.data().status !== 'cancelled').length;
          setAttendeeCount(activeRegs);
        }
      } catch (error) {
        console.error("Error fetching event details", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchEvent();
  }, [eventId]);

  useEffect(() => {
    const checkRegistration = async () => {
      if (!user || !event) return;
      try {
        const regId = `${eventId}_${user.uid}`;
        const regRef = doc(db, 'registrations', regId);
        const regSnap = await getDoc(regRef);
        
        if (regSnap.exists()) {
          setRegistrationStatus(regSnap.data().status);
        } else {
          setRegistrationStatus(null);
        }
      } catch (error) {
        console.error("Error checking registration", error);
      }
    };
    
    checkRegistration();
  }, [user, event, eventId]);

  const handleRegister = async () => {
    if (!user) {
      login();
      return;
    }
    
    if (!event) return;
    
    setIsRegistering(true);
    try {
      const registerForEvent = httpsCallable(functions, 'registerForEvent');
      const result = await registerForEvent({ eventId: event.id });
      
      const data = result.data as any;
      setRegistrationStatus(data.status);
      setAttendeeCount(data.attendeeCount);
    } catch (error: any) {
      console.error("Error registering", error);
      alert(error.message || "حدث خطأ أثناء التسجيل. حاول مرة أخرى.");
    } finally {
      setIsRegistering(false);
    }
  };

  const handleCancelRegistration = async () => {
    if (!user || !event) return;
    if (!confirm("هل أنت متأكد من إلغاء التسجيل؟")) return;
    
    setIsRegistering(true);
    try {
      const regId = `${eventId}_${user.uid}`;
      const regRef = doc(db, 'registrations', regId);
      
      await setDoc(regRef, {
        status: 'cancelled',
        cancelledAt: serverTimestamp()
      }, { merge: true });
      
      setRegistrationStatus('cancelled');
      setAttendeeCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error cancelling", error);
    } finally {
      setIsRegistering(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  if (!event) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-xl font-bold">الفعالية غير موجودة</div>;
  }

  const isFull = attendeeCount >= event.capacity;
  const isRegistrationOpen = event.state === 'Registration Open' || event.state === 'Published';
  const eventDate = event.date instanceof Date ? event.date : (event.date as any).toDate();
  
  const title = locale === 'en' ? event.titleEn : event.title;
  const description = locale === 'en' ? event.descriptionEn : event.description;
  const location = locale === 'en' ? event.locationEn : event.location;
  const gains = locale === 'en' ? event.gainsEn : event.gains;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cover Image */}
      <div className="w-full h-64 md:h-96 bg-blue-900 relative">
        {event.coverUrl ? (
          <img src={event.coverUrl} alt={title} className="w-full h-full object-cover opacity-80" />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-blue-700 to-indigo-800" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <span className="inline-block bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold mb-4">
            {event.type}
          </span>
          <h1 className="text-3xl md:text-5xl font-bold text-white font-cairo shadow-sm">{title}</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Details */}
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              <h2 className="text-2xl font-bold mb-4 font-cairo">عن الفعالية</h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{description}</p>
            </section>
            
            {gains && gains.length > 0 && (
              <section className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                <h2 className="text-2xl font-bold mb-4 font-cairo">ماذا ستتعلم؟</h2>
                <ul className="space-y-2">
                  {gains.map((gain, idx) => (
                    <li key={idx} className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-500 me-2 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{gain}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {event.speakers && event.speakers.length > 0 && (
              <section className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                <h2 className="text-2xl font-bold mb-4 font-cairo">المتحدثون</h2>
                <div className="flex flex-wrap gap-2">
                  {event.speakers.map((speaker, idx) => (
                    <span key={idx} className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg font-medium">{speaker}</span>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar CTA & Info */}
          <div className="space-y-6">
            {/* Registration Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 sticky top-24">
              <div className="space-y-4 mb-6">
                <div className="flex items-center text-gray-700">
                  <Calendar className="h-5 w-5 text-blue-600 me-3" />
                  <div>
                    <div className="font-semibold">{format(eventDate, 'dd MMMM yyyy', { locale: dateLocale })}</div>
                    <div className="text-sm text-gray-500">{format(eventDate, 'HH:mm', { locale: dateLocale })} ({event.durationHours} ساعات)</div>
                  </div>
                </div>
                <div className="flex items-center text-gray-700">
                  <MapPin className="h-5 w-5 text-blue-600 me-3" />
                  <span className="font-semibold">{location}</span>
                </div>
                <div className="flex items-center text-gray-700">
                  <Users className="h-5 w-5 text-blue-600 me-3" />
                  <span>{attendeeCount} / {event.capacity} مسجل</span>
                </div>
                <div className="flex items-center text-gray-700">
                  <Trophy className="h-5 w-5 text-yellow-500 me-3" />
                  <span>{event.points} نقطة</span>
                </div>
                {event.hasCertificate && (
                  <div className="flex items-center text-gray-700">
                    <Award className="h-5 w-5 text-green-500 me-3" />
                    <span>شهادة حضور معتمدة</span>
                  </div>
                )}
              </div>

              {/* Registration CTA Logic */}
              <div className="mt-8 pt-6 border-t border-gray-100">
                {!user ? (
                  <button onClick={login} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors">
                    تسجيل الدخول للحضور
                  </button>
                ) : (
                  <>
                    {!registrationStatus || registrationStatus === 'cancelled' ? (
                      <button 
                        onClick={handleRegister} 
                        disabled={!isRegistrationOpen || isRegistering}
                        className={`w-full py-3 rounded-xl font-bold transition-colors ${
                          !isRegistrationOpen ? 'bg-gray-200 text-gray-500 cursor-not-allowed' :
                          isFull ? 'bg-yellow-500 text-white hover:bg-yellow-600' :
                          'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {isRegistering ? 'جاري التسجيل...' : 
                         !isRegistrationOpen ? 'التسجيل مغلق' : 
                         isFull ? 'الانضمام لقائمة الانتظار' : 'سجل الآن'}
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <div className={`flex items-center justify-center p-3 rounded-xl font-bold ${
                          registrationStatus === 'approved' ? 'bg-green-100 text-green-700' :
                          registrationStatus === 'waitlisted' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {registrationStatus === 'approved' ? 'تم تأكيد تسجيلك!' :
                           registrationStatus === 'waitlisted' ? 'أنت في قائمة الانتظار' :
                           'طلبك قيد المراجعة'}
                        </div>
                        
                        {(event.state === 'Registration Open' || event.state === 'Published') && (
                          <button 
                            onClick={handleCancelRegistration}
                            disabled={isRegistering}
                            className="w-full text-red-500 text-sm font-medium hover:underline p-2"
                          >
                            إلغاء التسجيل
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
