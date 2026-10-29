'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from '@/i18n/routing';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Link } from '@/i18n/routing';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  QrCode, 
  LogOut, 
  Lightbulb, 
  ChevronLeft, 
  ChevronRight,
  ShieldAlert,
  Home,
  Wrench,
  Settings,
  Activity,
  BarChart3,
  ClipboardList,
  Rocket
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import NotificationQueueControl from '@/components/admin/NotificationQueueControl';
import ConfigurationNotice from '@/components/admin/ConfigurationNotice';

const subscribeSidebar = (notify: () => void) => {
  window.addEventListener('storage', notify);
  window.addEventListener('ieee-sidebar', notify);
  return () => {
    window.removeEventListener('storage', notify);
    window.removeEventListener('ieee-sidebar', notify);
  };
};
const getSidebarSnapshot = () => {
  try { return localStorage.getItem('admin_sidebar_collapsed') === 'true'; }
  catch { return false; }
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, userData, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const isAr = locale === 'ar';
  const [mobileOpen, setMobileOpen] = useState(false);

  const isCollapsed = useSyncExternalStore(subscribeSidebar, getSidebarSnapshot, () => false);
  const toggleSidebar = () => {
    try { localStorage.setItem('admin_sidebar_collapsed', String(!isCollapsed)); }
    catch { return; }
    window.dispatchEvent(new Event('ieee-sidebar'));
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
          <span>{isAr ? 'العودة للمنصة الرئيسية' : 'Return to Home'}</span>
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
    { name: isAr ? 'مركز العمل' : 'Command center', href: '/admin', icon: <LayoutDashboard size={20} /> },
    { name: isAr ? 'إدارة الفعاليات' : 'Events', href: '/admin/events', icon: <Calendar size={20} /> },
    { name: isAr ? 'معرض المشاريع' : 'Projects Showcase', href: '/admin/showcase', icon: <Rocket size={20} /> },
    { name: isAr ? 'المسجلون والطلاب' : 'Users & Members', href: '/admin/users', icon: <Users size={20} /> },
    { name: isAr ? 'تسجيل الحضور (QR)' : 'Check-In Desk', href: '/admin/check-in', icon: <QrCode size={20} /> },
    { name: isAr ? 'الأفكار والمبادرات' : 'Ideas & Proposals', href: '/admin/ideas', icon: <Lightbulb size={20} /> },
    { name: isAr ? 'الهيكلة والتنظيم' : 'Structure Management', href: '/admin/structure', icon: <Users size={20} /> },
    { name: isAr ? 'محتوى الموقع' : 'Site content', href: '/admin/content', icon: <Settings size={20} /> },
    { name: isAr ? 'مركز المهام' : 'Operations', href: '/admin/operations', icon: <Activity size={20} /> },
    { name: isAr ? 'التقارير' : 'Reports', href: '/admin/reports', icon: <BarChart3 size={20} /> },
    ...(userData.role === 'super_admin' ? [{ name: isAr ? 'سجل الإجراءات' : 'Audit log', href: '/admin/audit', icon: <ClipboardList size={20} /> }] : []),
    ...(userData.role === 'super_admin' ? [{ name: isAr ? 'وضع الصيانة' : 'Maintenance mode', href: '/admin/maintenance', icon: <Wrench size={20} /> }] : []),
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
        <div className="p-3 sm:p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className={`truncate ${isCollapsed ? 'md:hidden' : ''}`}>
            <h2 className="text-base sm:text-lg font-black font-cairo text-purple-400 tracking-wide">
              {isAr ? 'لوحة الإدارة' : 'Admin Portal'}
            </h2>
            <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
              IEEE Qassim
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Mobile partial collapse / expand button */}
            <button
              type="button"
              aria-controls="admin-navigation-panel"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(value => !value)}
              className="md:hidden inline-flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-slate-200 transition-colors"
            >
              {mobileOpen ? (isAr ? 'إخفاء جزئي (أيقونات)' : 'Icons only') : (isAr ? 'عرض العناوين' : 'Full menu')}
            </button>
            
            <button
              onClick={toggleSidebar}
              aria-label={isCollapsed ? (isAr ? 'توسيع القائمة' : 'Expand sidebar') : (isAr ? 'طي القائمة' : 'Collapse sidebar')}
              aria-expanded={!isCollapsed}
              className={`hidden md:block p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all ${
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
        </div>

        {/* Mobile quick icons strip when full menu is closed (partial collapse) */}
        {!mobileOpen && (
          <div className="md:hidden flex items-center gap-1 p-2 overflow-x-auto no-scrollbar border-b border-slate-800/60 bg-slate-900/90">
            {navItems.map((item) => {
              const active = isCurrentPath(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-label={item.name}
                  title={item.name}
                  className={`p-2.5 rounded-xl shrink-0 transition-colors ${
                    active
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {item.icon}
                </Link>
              );
            })}
            <Link
              href="/"
              title={isAr ? 'العودة للمنصة' : 'Back to main site'}
              className="p-2.5 rounded-xl shrink-0 text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <LogOut size={20} className="rtl:rotate-180" />
            </Link>
          </div>
        )}
        
        {/* Navigation Links */}
        <div id="admin-navigation-panel" className={`${mobileOpen ? 'flex' : 'hidden'} md:flex flex-1 flex-col`}>
        <nav aria-label={isAr ? 'التنقل الإداري' : 'Admin navigation'} className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = isCurrentPath(item.href);
            return (
              <Link 
                key={item.href} 
                href={item.href}
                onClick={() => setMobileOpen(false)}
                aria-label={item.name}
                aria-current={active ? 'page' : undefined}
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
                  <span className={`text-sm truncate leading-none ${isCollapsed ? 'md:hidden' : ''}`}>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Return to Main Site Button */}
        {!isCollapsed && <NotificationQueueControl />}
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
        </div>
      </aside>

      {/* Main Content */}
      <div className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          <ConfigurationNotice />
          {children}
        </div>
      </div>
    </div>
  );
}
