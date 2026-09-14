'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useAuth } from '@/context/AuthContext';
import { Calendar, Trophy, ArrowRight, UserCircle } from 'lucide-react';

export default function HomePage() {
  const t = useTranslations('Index');
  const { user, login, logout, userData } = useAuth();
  const locale = useLocale();
  const isAr = locale === 'ar';

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
              <Link href="/events" className="hover:text-blue-600">{isAr ? 'الفعاليات' : 'Events'}</Link>
              <Link href="/leaderboard" className="hover:text-blue-600">{isAr ? 'لوحة الشرف' : 'Leaderboard'}</Link>
              {user && <Link href="/my-activity" className="hover:text-blue-600">{isAr ? 'نشاطي' : 'My Activity'}</Link>}
              {userData?.role === 'super_admin' || userData?.role === 'event_organizer' ? (
                <Link href="/admin" className="hover:text-blue-600 text-purple-600">{isAr ? 'الإدارة' : 'Admin'}</Link>
              ) : null}
            </div>

            <div className="flex items-center space-x-3 space-x-reverse">
              <Link href="/" locale={isAr ? 'en' : 'ar'} className="text-sm text-gray-500 hover:text-gray-900">{isAr ? 'EN' : 'عربي'}</Link>
              
              {user ? (
                <div className="flex items-center space-x-2 space-x-reverse">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold overflow-hidden">
                    {user.photoURL ? <img src={user.photoURL} alt="Profile" /> : <UserCircle size={20} />}
                  </div>
                  <button onClick={logout} className="text-sm text-red-500 hover:text-red-700 font-medium hidden sm:block">
                    {isAr ? 'تسجيل الخروج' : 'Logout'}
                  </button>
                </div>
              ) : (
                <button 
                  onClick={login}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
                >
                  {isAr ? 'تسجيل الدخول' : 'Login'}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow">
        {/* Premium Hero Section */}
        <section className="relative overflow-hidden bg-slate-900 text-white pt-24 pb-32 px-4 sm:px-6 lg:px-8">
          {/* Abstract Background Elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
            <div className="absolute top-40 -left-40 w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-40 left-20 w-96 h-96 bg-indigo-600 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>
            
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900"></div>
          </div>

          <div className="relative max-w-5xl mx-auto text-center z-10">
            <div className="inline-flex items-center space-x-2 space-x-reverse bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 mb-8 shadow-lg">
              <span className="flex h-2 w-2 rounded-full bg-green-400 animate-pulse"></span>
              <span className="text-sm font-medium text-blue-100">{isAr ? 'بوابتك للتميز التقني في جامعة القصيم' : 'Your gateway to technical excellence at Qassim University'}</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-extrabold mb-8 font-cairo leading-tight tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-100 via-white to-blue-200 drop-shadow-sm">
              {t('title')}
            </h1>
            
            <p className="text-xl md:text-2xl text-blue-100/80 max-w-3xl mx-auto font-sans mb-12 leading-relaxed">
              {t('description')}
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
              <Link href="/events" className="group flex items-center justify-center w-full sm:w-auto bg-blue-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-blue-500 transition-all shadow-[0_0_40px_-10px_rgba(37,99,235,0.7)] hover:shadow-[0_0_60px_-15px_rgba(37,99,235,0.9)] transform hover:-translate-y-1">
                {isAr ? 'استكشف الفعاليات' : 'Explore Events'}
                <ArrowRight className="ms-2 h-5 w-5 rtl:-scale-x-100 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
              </Link>
              
              {!user && (
                <button onClick={login} className="flex items-center justify-center w-full sm:w-auto bg-white/10 backdrop-blur-md border border-white/20 text-white px-8 py-4 rounded-xl font-bold hover:bg-white/20 transition-all transform hover:-translate-y-1">
                  {isAr ? 'سجل دخولك الآن' : 'Login Now'}
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Quick Links / Highlights */}
        <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="h-12 w-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                <Calendar className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">{isAr ? 'فعاليات قادمة' : 'Upcoming Events'}</h3>
              <p className="text-gray-600 mb-4">{isAr ? 'انضم إلى ورش العمل والمعسكرات وتعرف على أحدث التقنيات.' : 'Join workshops and bootcamps to learn the latest technologies.'}</p>
              <Link href="/events" className="text-blue-600 font-medium hover:underline flex items-center">
                {isAr ? 'عرض الكل' : 'View All'} <ArrowRight className="ms-1 h-4 w-4 rtl:-scale-x-100" />
              </Link>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="h-12 w-12 bg-yellow-100 text-yellow-600 rounded-xl flex items-center justify-center mb-4">
                <Trophy className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">{isAr ? 'لوحة الشرف' : 'Leaderboard'}</h3>
              <p className="text-gray-600 mb-4">{isAr ? 'احصل على النقاط مقابل مشاركتك وتنافس مع زملائك على المراكز الأولى.' : 'Earn points for your participation and compete for the top spots.'}</p>
              <Link href="/leaderboard" className="text-blue-600 font-medium hover:underline flex items-center">
                {isAr ? 'اكتشف المتصدرين' : 'Discover Leaders'} <ArrowRight className="ms-1 h-4 w-4 rtl:-scale-x-100" />
              </Link>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="h-12 w-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center mb-4">
                <UserCircle className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">{isAr ? 'نشاطك وشهاداتك' : 'Activity & Certificates'}</h3>
              <p className="text-gray-600 mb-4">{isAr ? 'تتبع الفعاليات التي حضرتها، نقاطك، واطبع شهاداتك بكل سهولة.' : 'Track your events, points, and download your certificates.'}</p>
              <Link href="/my-activity" className="text-blue-600 font-medium hover:underline flex items-center">
                {isAr ? 'انتقل إلى نشاطي' : 'Go to My Activity'} <ArrowRight className="ms-1 h-4 w-4 rtl:-scale-x-100" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      
      <footer className="bg-gray-900 text-gray-400 py-8 text-center text-sm">
        <p>{isAr ? 'منصة مجتمع التكنولوجيا الجامعي' : 'University Technology Community Platform'} © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
