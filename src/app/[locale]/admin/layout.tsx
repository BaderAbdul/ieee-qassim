'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from '@/i18n/routing';
import { useEffect, useState } from 'react';
import { Link } from '@/i18n/routing';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  QrCode, 
  LogOut, 
  Lightbulb, 
  PanelLeftClose, 
  PanelLeftOpen, 
  ChevronLeft, 
  ChevronRight,
  ShieldAlert,
  Home
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, userData, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const isAr = locale === 'ar';

  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('admin_sidebar_collapsed');
    if (saved !== null) {
      setIsCollapsed(saved === 'true');
    }
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('admin_sidebar_collapsed', String(next));
      return next;
    });
  };

  useEffect(() => {
    if (!loading) {
      if (!user || (userData?.role !== 'super_admin' && userData?.role !== 'event_organizer')) {
        router.replace('/');
      }
    }
  }, [user, userData, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!user || (userData?.role !== 'super_admin' && userData?.role !== 'event_organizer')) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 text-center">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4 animate-bounce" />
        <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2 font-cairo">
          {isAr ? 'غير مصرح بالدخول' : 'Access Denied'}
        </h2>
        <p className="text-slate-500 text-sm mb-6 max-w-md">
          {isAr ? 'هذه الصفحة مخصصة لمديري ومنظمي الفعاليات فقط.' : 'This section is restricted to organizers and super admins only.'}
        </p>
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all"
        >
          <Home className="w-4 h-4" />
          <span>{isAr ? 'العودة للمنعش الرئيسي' : 'Return to Home'}</span>
        </Link>
      </div>
    );
  }

  const isCurrentPath = (path: string) => {
    if (path === '/admin') {
      return pathname.endsWith('/admin');
    }
    return pathname.includes(path);
  };

  const navItems = [
    { name: isAr ? 'نظرة عامة' : 'Overview', href: '/admin', icon: <LayoutDashboard size={20} /> },
    { name: isAr ? 'إدارة الفعاليات' : 'Events', href: '/admin/events', icon: <Calendar size={20} /> },
    { name: isAr ? 'المسجلون والطلاب' : 'Users & Members', href: '/admin/users', icon: <Users size={20} /> },
    { name: isAr ? 'تسجيل الحضور (QR)' : 'Check-In Desk', href: '/admin/check-in', icon: <QrCode size={20} /> },
    { name: isAr ? 'الأفكار والمبادرات' : 'Ideas & Proposals', href: '/admin/ideas', icon: <Lightbulb size={20} /> },
    { name: isAr ? 'الهيكلة والتنظيم' : 'Structure Management', href: '/admin/structure', icon: <Users size={20} /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      {/* Sidebar */}
      <aside 
        className={`w-full bg-slate-900 text-white md:min-h-screen flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out border-e border-slate-800 ${
          isCollapsed ? 'md:w-20' : 'md:w-64'
        }`}
      >
        {/* Header & Toggle Button */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between">
          {!isCollapsed && (
            <div className="truncate">
              <h2 className="text-lg font-black font-cairo text-purple-400 tracking-wide">
                {isAr ? 'لوحة الإدارة' : 'Admin Portal'}
              </h2>
              <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                IEEE Qassim
              </p>
            </div>
          )}
          
          <button
            onClick={toggleSidebar}
            className={`p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all ${
              isCollapsed ? 'mx-auto' : ''
            }`}
            title={isCollapsed ? (isAr ? 'توسيع القائمة' : 'Expand Sidebar') : (isAr ? 'طَيّ القائمة (أيقونات فقط)' : 'Collapse Sidebar')}
          >
            {isCollapsed ? (
              isAr ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />
            ) : (
              isAr ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />
            )}
          </button>
        </div>
        
        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = isCurrentPath(item.href);
            return (
              <Link 
                key={item.href} 
                href={item.href}
                title={isCollapsed ? item.name : undefined}
                className={`flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all ${
                  isCollapsed ? 'justify-center' : ''
                } ${
                  active 
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-900/30 font-bold' 
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white font-medium'
                }`}
              >
                <div className="flex-shrink-0">{item.icon}</div>
                {!isCollapsed && (
                  <span className="text-sm truncate leading-none">{item.name}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Return to Main Site Button */}
        <div className="p-3 border-t border-slate-800/80">
          <Link 
            href="/" 
            title={isCollapsed ? (isAr ? 'العودة للمنصة' : 'Return to Home') : undefined}
            className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition-all ${
              isCollapsed ? 'justify-center' : ''
            }`}
          >
            <LogOut size={20} className="rtl:rotate-180 flex-shrink-0" />
            {!isCollapsed && (
              <span className="font-medium text-sm truncate">{isAr ? 'العودة للمنصة' : 'Back to Main Site'}</span>
            )}
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
