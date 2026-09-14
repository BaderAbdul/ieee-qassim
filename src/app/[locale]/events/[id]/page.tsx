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

import LoadingSpinner from '@/components/ui/LoadingSpinner';

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
          // Count only active registrations (Approved or Pending or Waitlisted)
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
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <LoadingSpinner size="lg" color="border-blue-600" />
        <p className="mt-4 text-blue-600 font-medium">جاري تحميل التفاصيل...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <AlertCircle className="h-16 w-16 text-red-400 mb-4" />
        <h2 className="text-2xl font-bold text-slate-800 font-cairo">الفعالية غير موجودة</h2>
      </div>
    );
  }

  const isFull = attendeeCount >= event.capacity;
  const isRegistrationOpen = event.state === 'Registration Open' || event.state === 'Published';
  const eventDate = event.date instanceof Date ? event.date : (event.date as any).toDate();
  
  const title = locale === 'en' ? event.titleEn : event.title;
  const description = locale === 'en' ? event.descriptionEn : event.description;
  const location = locale === 'en' ? event.locationEn : event.location;
  const gains = locale === 'en' ? event.gainsEn : event.gains;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Cover Image */}
      <div className="w-full h-72 md:h-96 bg-blue-900 relative">
        {event.coverUrl ? (
          <img src={event.coverUrl} alt={title} className="w-full h-full object-cover opacity-70 mix-blend-overlay" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-800 to-indigo-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
          <span className="inline-block bg-blue-500/20 text-blue-100 backdrop-blur-md border border-blue-400/30 px-4 py-1.5 rounded-full text-sm font-bold mb-5">
            {event.type}
          </span>
          <h1 className="text-4xl md:text-6xl font-extrabold text-white font-cairo shadow-sm leading-tight max-w-4xl">{title}</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          
          {/* Main Details */}
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
              <h2 className="text-2xl font-bold mb-6 font-cairo text-slate-800 flex items-center">
                <div className="w-1.5 h-6 bg-blue-600 rounded-full rtl:ml-3 ltr:mr-3"></div>
                عن الفعالية
              </h2>
              <p className="text-slate-600 text-lg leading-relaxed whitespace-pre-wrap">{description}</p>
            </section>
            
            {gains && gains.length > 0 && (
              <section className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                <h2 className="text-2xl font-bold mb-6 font-cairo text-slate-800 flex items-center">
                  <div className="w-1.5 h-6 bg-green-500 rounded-full rtl:ml-3 ltr:mr-3"></div>
                  ماذا ستتعلم؟
                </h2>
                <ul className="space-y-4">
                  {gains.map((gain, idx) => (
                    <li key={idx} className="flex items-start">
                      <div className="bg-green-50 p-1 rounded-full rtl:ml-3 ltr:mr-3 mt-0.5 flex-shrink-0">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                      <span className="text-slate-700 text-lg">{gain}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {event.speakers && event.speakers.length > 0 && (
              <section className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                <h2 className="text-2xl font-bold mb-6 font-cairo text-slate-800 flex items-center">
                  <div className="w-1.5 h-6 bg-purple-500 rounded-full rtl:ml-3 ltr:mr-3"></div>
                  المتحدثون
                </h2>
                <div className="flex flex-wrap gap-3">
                  {event.speakers.map((speaker, idx) => (
                    <span key={idx} className="bg-slate-100 text-slate-700 px-5 py-2.5 rounded-xl font-semibold border border-slate-200 shadow-sm">{speaker}</span>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar CTA & Info */}
          <div className="space-y-6">
            {/* Registration Card */}
            <div className="bg-white rounded-3xl p-8 shadow-md border border-blue-50 sticky top-24">
              <div className="space-y-6 mb-8">
                <div className="flex items-start text-slate-700">
                  <div className="bg-blue-50 p-2.5 rounded-xl rtl:ml-4 ltr:mr-4">
                    <Calendar className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-bold text-lg">{format(eventDate, 'dd MMMM yyyy', { locale: dateLocale })}</div>
                    <div className="text-slate-500">{format(eventDate, 'HH:mm', { locale: dateLocale })} ({event.durationHours} ساعات)</div>
                  </div>
                </div>
                
                <div className="flex items-center text-slate-700">
                  <div className="bg-blue-50 p-2.5 rounded-xl rtl:ml-4 ltr:mr-4">
                    <MapPin className="h-6 w-6 text-blue-600" />
                  </div>
                  <span className="font-bold text-lg">{location}</span>
                </div>
                
                <div className="flex items-center text-slate-700">
                  <div className="bg-blue-50 p-2.5 rounded-xl rtl:ml-4 ltr:mr-4">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-lg">{attendeeCount} / {event.capacity} مسجل</span>
                    {isFull && <span className="text-sm text-orange-500 font-medium">الفعالية ممتلئة (متاح قائمة انتظار)</span>}
                  </div>
                </div>
                
                <div className="flex items-center text-slate-700">
                  <div className="bg-yellow-50 p-2.5 rounded-xl rtl:ml-4 ltr:mr-4">
                    <Trophy className="h-6 w-6 text-yellow-600" />
                  </div>
                  <span className="font-bold text-lg">{event.points} نقطة</span>
                </div>
                
                {event.hasCertificate && (
                  <div className="flex items-center text-slate-700">
                    <div className="bg-green-50 p-2.5 rounded-xl rtl:ml-4 ltr:mr-4">
                      <Award className="h-6 w-6 text-green-600" />
                    </div>
                    <span className="font-bold text-lg">شهادة حضور معتمدة</span>
                  </div>
                )}
              </div>

              {/* Registration CTA Logic */}
              <div className="mt-8 pt-8 border-t border-slate-100">
                {!user ? (
                  <button onClick={login} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-lg">
                    تسجيل الدخول للحضور
                  </button>
                ) : (
                  <>
                    {!registrationStatus || registrationStatus === 'cancelled' ? (
                      <button 
                        onClick={handleRegister} 
                        disabled={!isRegistrationOpen || isRegistering}
                        className={`w-full py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center ${
                          !isRegistrationOpen ? 'bg-slate-100 text-slate-400 cursor-not-allowed' :
                          isFull ? 'bg-yellow-500 text-white hover:bg-yellow-600 shadow-md' :
                          'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
                        }`}
                      >
                        {isRegistering ? (
                          <>
                            <LoadingSpinner size="sm" color="border-white" className="rtl:ml-3 ltr:mr-3" />
                            <span>جاري التسجيل...</span>
                          </>
                        ) : !isRegistrationOpen ? 'التسجيل مغلق' : 
                         isFull ? 'الانضمام لقائمة الانتظار' : 'سجل الآن في الفعالية'}
                      </button>
                    ) : (
                      <div className="space-y-4">
                        <div className={`flex flex-col items-center justify-center p-5 rounded-2xl text-center border ${
                          registrationStatus === 'approved' ? 'bg-green-50 text-green-800 border-green-200' :
                          registrationStatus === 'waitlisted' ? 'bg-yellow-50 text-yellow-800 border-yellow-200' :
                          'bg-blue-50 text-blue-800 border-blue-200'
                        }`}>
                          <span className="font-bold text-lg mb-1">
                            {registrationStatus === 'approved' ? 'تم تأكيد تسجيلك!' :
                             registrationStatus === 'waitlisted' ? 'أنت في قائمة الانتظار' :
                             'طلبك قيد المراجعة'}
                          </span>
                          <span className="text-sm opacity-80">
                            {registrationStatus === 'approved' ? 'ننتظر رؤيتك في الفعالية' :
                             registrationStatus === 'waitlisted' ? 'سنعلمك في حال توفر مقعد' :
                             'سيتم مراجعة طلبك من قبل المنظمين'}
                          </span>
                        </div>
                        
                        {(event.state === 'Registration Open' || event.state === 'Published') && (
                          <button 
                            onClick={handleCancelRegistration}
                            disabled={isRegistering}
                            className="w-full text-red-500 font-bold hover:bg-red-50 py-3 rounded-xl transition-colors flex items-center justify-center"
                          >
                            {isRegistering ? <LoadingSpinner size="sm" color="border-red-500" /> : 'إلغاء التسجيل'}
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
