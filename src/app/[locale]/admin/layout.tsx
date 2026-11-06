'use client';

import { hasAnyPrivilege, useAuth } from '@/context/AuthContext';
import { useRouter } from '@/i18n/routing';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Link } from '@/i18n/routing';
import { 
  LayoutDashboard, 
  Calendar, 
  Users,
  LogOut,
  Lightbulb, 
  ChevronLeft, 
  ChevronRight,
  ShieldAlert,
  Home,
  Wrench,
  Settings,
  Activity,
  ClipboardList,
  Rocket,
  Shield,
  UsersRound,
  Award,
  Sun,
  Moon,
  Mail
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

const subscribeTheme = (notify: () => void) => {
  window.addEventListener('storage', notify);
  window.addEventListener('ieee-admin-theme', notify);
  return () => {
    window.removeEventListener('storage', notify);
    window.removeEventListener('ieee-admin-theme', notify);
  };
};
const getThemeSnapshot = () => {
  try { return localStorage.getItem('admin_theme') === 'dark'; }
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

  const isDark = useSyncExternalStore(subscribeTheme, getThemeSnapshot, () => false);
  const toggleTheme = () => {
    try { localStorage.setItem('admin_theme', isDark ? 'light' : 'dark'); }
    catch { return; }
    window.dispatchEvent(new Event('ieee-admin-theme'));
  };
  const themeClass = `ieee-admin-theme${isDark ? ' dark' : ''}`;

  const isDashboardUser = !!userData && userData.role !== 'student';

  useEffect(() => {
    if (loading || (user && isDashboardUser)) return;
    // On a hard refresh Clerk can report "not signed in yet" for an instant before it finishes
    // restoring the session from the browser, which would otherwise redirect a valid admin out
    // before /api/me even gets a chance to answer. Wait briefly for that to settle; if the real
    // state changes (loading again, or now authorized), this effect reruns and cancels the timer.
    const timer = window.setTimeout(() => { router.replace('/'); }, 800);
    return () => window.clearTimeout(timer);
  }, [user, userData, isDashboardUser, loading, router]);

  if (loading) {
    return (
      <div className={`${themeClass} min-h-screen flex items-center justify-center bg-[var(--color-page)]`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-accent)]"></div>
      </div>
    );
  }

  if (!user || !isDashboardUser) {
    return (
      <div className={`${themeClass} min-h-screen flex flex-col items-center justify-center bg-[var(--color-page)] px-4 text-center`}>
        <ShieldAlert className="w-16 h-16 text-[var(--color-danger)] mb-4 animate-bounce" />
        <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)] mb-2 font-cairo">
          {isAr ? 'غير مصرح بالدخول' : 'Access Denied'}
        </h2>
        <p className="text-[var(--color-text-secondary)] text-sm mb-6 max-w-md">
          {isAr ? 'هذه الصفحة مخصصة لمديري ومنظمي الفعاليات فقط.' : 'This section is restricted to organizers and super admins only.'}
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-[var(--color-accent)] hover:opacity-90 text-[var(--color-accent-contrast)] px-5 py-2.5 rounded-xl font-bold text-sm transition-all"
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

  const isSuperAdmin = userData.isSuperAdmin === true || userData.role === 'super_admin';

  const navItems = [
    { name: isAr ? 'مركز العمل' : 'Command center', href: '/admin', icon: <LayoutDashboard size={20} /> },
    ...(hasAnyPrivilege(userData, 'events') ? [{ name: isAr ? 'إدارة الفعاليات' : 'Events', href: '/admin/events', icon: <Calendar size={20} /> }] : []),
    ...(hasAnyPrivilege(userData, 'showcase') ? [{ name: isAr ? 'معرض المشاريع' : 'Projects Showcase', href: '/admin/showcase', icon: <Rocket size={20} /> }] : []),
    ...(hasAnyPrivilege(userData, 'members') ? [{ name: isAr ? 'المسجلون والطلاب' : 'Users & Members', href: '/admin/users', icon: <Users size={20} /> }] : []),
    ...(hasAnyPrivilege(userData, 'ideas') ? [{ name: isAr ? 'الأفكار والمبادرات' : 'Ideas & Proposals', href: '/admin/ideas', icon: <Lightbulb size={20} /> }] : []),
    ...(hasAnyPrivilege(userData, 'content') ? [{ name: isAr ? 'محتوى الموقع' : 'Site content', href: '/admin/content', icon: <Settings size={20} /> }] : []),
    ...(hasAnyPrivilege(userData, 'content') ? [{ name: isAr ? 'قوالب البريد والشهادات' : 'Email & certificate templates', href: '/admin/templates', icon: <Mail size={20} /> }] : []),
    ...(hasAnyPrivilege(userData, 'operations') ? [{ name: isAr ? 'مركز المهام' : 'Operations', href: '/admin/operations', icon: <Activity size={20} /> }] : []),
    ...(isSuperAdmin ? [{ name: isAr ? 'الأدوار والصلاحيات' : 'Roles & Privileges', href: '/admin/roles', icon: <Shield size={20} /> }] : []),
    ...(isSuperAdmin ? [{ name: isAr ? 'الفرق' : 'Teams', href: '/admin/teams', icon: <UsersRound size={20} /> }] : []),
    ...(isSuperAdmin ? [{ name: isAr ? 'الأوسمة الإدارية' : 'Admin Badges', href: '/admin/badges', icon: <Award size={20} /> }] : []),
    ...(isSuperAdmin ? [{ name: isAr ? 'سجل الإجراءات' : 'Audit log', href: '/admin/audit', icon: <ClipboardList size={20} /> }] : []),
    ...(isSuperAdmin ? [{ name: isAr ? 'وضع الصيانة' : 'Maintenance mode', href: '/admin/maintenance', icon: <Wrench size={20} /> }] : []),
  ];

  return (
    <div className={`${themeClass} min-h-screen bg-[var(--color-page)] flex flex-col md:flex-row font-sans relative overflow-hidden`}>
      {/* Decorative background shapes -- purely visual, sits behind the glass sidebar and cards */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden -z-10" aria-hidden="true">
        <div className="absolute -top-24 -start-24 w-[28rem] h-[28rem] rounded-full bg-[var(--color-accent)]/20 blur-3xl animate-blob" />
        <div className="absolute top-1/3 -end-32 w-[24rem] h-[24rem] rounded-full bg-[var(--color-highlight)]/15 blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute bottom-0 start-1/4 w-[22rem] h-[22rem] rounded-full bg-[var(--color-accent)]/15 blur-3xl animate-blob animation-delay-4000" />
      </div>

      {/* Sidebar: floats over the background, glassmorphic, kept dark regardless of theme */}
      <aside
        className={`relative z-10 w-full m-3 md:ms-3 md:me-0 bg-slate-900/70 backdrop-blur-xl text-white md:h-[calc(100vh-1.5rem)] rounded-3xl overflow-hidden flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out border border-white/10 shadow-2xl ${
          isCollapsed ? 'md:w-20' : 'md:w-64'
        }`}
      >
        {/* Header & Toggle Button */}
        <div className="p-3 sm:p-5 border-b border-white/10 flex items-center justify-between">
          <div className={`truncate ${isCollapsed ? 'md:hidden' : ''}`}>
            <h2 className="text-base sm:text-lg font-black font-cairo text-[#4DA8DA] tracking-wide">
              {isAr ? 'لوحة الإدارة' : 'Admin Portal'}
            </h2>
            <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
              IEEE Qassim
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleTheme}
              aria-label={isDark ? (isAr ? 'الوضع الفاتح' : 'Light mode') : (isAr ? 'الوضع الداكن' : 'Dark mode')}
              title={isDark ? (isAr ? 'الوضع الفاتح' : 'Light mode') : (isAr ? 'الوضع الداكن' : 'Dark mode')}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all"
            >
              {isDark ? <Sun className="w-4 h-4 sm:w-5 sm:h-5" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>

            {/* Mobile partial collapse / expand button */}
            <button
              type="button"
              aria-controls="admin-navigation-panel"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(value => !value)}
              className="md:hidden inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-bold text-slate-200 transition-colors"
            >
              {mobileOpen ? (isAr ? 'إخفاء جزئي (أيقونات)' : 'Icons only') : (isAr ? 'عرض العناوين' : 'Full menu')}
            </button>

            <button
              onClick={toggleSidebar}
              aria-label={isCollapsed ? (isAr ? 'توسيع القائمة' : 'Expand sidebar') : (isAr ? 'طي القائمة' : 'Collapse sidebar')}
              aria-expanded={!isCollapsed}
              className={`hidden md:block p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all ${
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
          <div className="md:hidden flex items-center gap-1 p-2 overflow-x-auto no-scrollbar border-b border-white/10 bg-slate-900/60">
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
                      ? 'bg-[#00629B] text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {item.icon}
                </Link>
              );
            })}
            <Link
              href="/"
              title={isAr ? 'العودة للمنصة' : 'Back to main site'}
              className="p-2.5 rounded-xl shrink-0 text-slate-400 hover:text-white hover:bg-white/10"
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
                    ? 'bg-[#00629B] text-white shadow-md shadow-black/30 font-bold'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white font-medium'
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
        <div className="p-3 border-t border-white/10">
          <Link 
            href="/" 
            title={isCollapsed ? (isAr ? 'العودة للمنصة' : 'Return to Home') : undefined}
            className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-slate-300 hover:bg-white/10 hover:text-white transition-all ${
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
