'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useAuth } from '@/context/AuthContext';
import { Calendar, Trophy, ArrowRight, UserCircle } from 'lucide-react';

export default function HomePage() {
  const t = useTranslations('Index');
  const { user, login, logout, userData } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navbar */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4 space-x-reverse">
            <span className="text-2xl font-bold text-blue-700 font-cairo">TechComm</span>
          </div>
          
          <div className="flex items-center space-x-6 space-x-reverse">
            <div className="hidden md:flex space-x-4 space-x-reverse text-sm font-medium text-gray-600">
              <Link href="/events" className="hover:text-blue-600">الفعاليات</Link>
              <Link href="/leaderboard" className="hover:text-blue-600">لوحة الشرف</Link>
              {user && <Link href="/my-activity" className="hover:text-blue-600">نشاطي</Link>}
              {userData?.role === 'super_admin' || userData?.role === 'event_organizer' ? (
                <Link href="/admin" className="hover:text-blue-600 text-purple-600">الإدارة</Link>
              ) : null}
            </div>

            <div className="flex items-center space-x-3 space-x-reverse">
              <Link href="/" locale="en" className="text-sm text-gray-500 hover:text-gray-900">EN</Link>
              
              {user ? (
                <div className="flex items-center space-x-2 space-x-reverse">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold overflow-hidden">
                    {user.photoURL ? <img src={user.photoURL} alt="Profile" /> : <UserCircle size={20} />}
                  </div>
                  <button onClick={logout} className="text-sm text-red-500 hover:text-red-700 font-medium hidden sm:block">
                    تسجيل الخروج
                  </button>
                </div>
              ) : (
                <button 
                  onClick={login}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
                >
                  تسجيل الدخول
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-blue-50 to-white py-20 px-4 sm:px-6 lg:px-8 text-center border-b border-gray-100">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 font-cairo max-w-4xl mx-auto leading-tight">
            {t('title')}
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 max-w-2xl mx-auto font-sans mb-10">
            {t('description')}
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/events" className="flex items-center bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
              استكشف الفعاليات
              <ArrowRight className="ms-2 h-5 w-5 rtl:-scale-x-100" />
            </Link>
          </div>
        </section>

        {/* Quick Links / Highlights */}
        <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="h-12 w-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                <Calendar className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">فعاليات قادمة</h3>
              <p className="text-gray-600 mb-4">انضم إلى ورش العمل والمعسكرات وتعرف على أحدث التقنيات.</p>
              <Link href="/events" className="text-blue-600 font-medium hover:underline flex items-center">
                عرض الكل <ArrowRight className="ms-1 h-4 w-4 rtl:-scale-x-100" />
              </Link>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="h-12 w-12 bg-yellow-100 text-yellow-600 rounded-xl flex items-center justify-center mb-4">
                <Trophy className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">لوحة الشرف</h3>
              <p className="text-gray-600 mb-4">احصل على النقاط مقابل مشاركتك وتنافس مع زملائك على المراكز الأولى.</p>
              <Link href="/leaderboard" className="text-blue-600 font-medium hover:underline flex items-center">
                اكتشف المتصدرين <ArrowRight className="ms-1 h-4 w-4 rtl:-scale-x-100" />
              </Link>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="h-12 w-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center mb-4">
                <UserCircle className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">نشاطك وشهاداتك</h3>
              <p className="text-gray-600 mb-4">تتبع الفعاليات التي حضرتها، نقاطك، واطبع شهاداتك بكل سهولة.</p>
              <Link href="/my-activity" className="text-blue-600 font-medium hover:underline flex items-center">
                انتقل إلى نشاطي <ArrowRight className="ms-1 h-4 w-4 rtl:-scale-x-100" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      
      <footer className="bg-gray-900 text-gray-400 py-8 text-center text-sm">
        <p>منصة مجتمع التكنولوجيا الجامعي © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
