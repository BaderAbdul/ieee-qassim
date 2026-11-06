'use client';

import { hasAnyPrivilege, useAuth } from '@/context/AuthContext';
import { useRouter } from '@/i18n/routing';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Link } from '@/i18n/routing';
import {
  LayoutDashboard,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Home,
  Settings,
  Activity,
  UsersRound,
  Sun,
  Moon,
  Mail,
  Layers,
  CircleUserRound
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
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

  const canEditContent = hasAnyPrivilege(userData, 'content');
  const canViewMembers = hasAnyPrivilege(userData, 'members');

  const navItems = [
    { name: isAr ? 'الرئيسية' : 'Home', href: '/admin', icon: <LayoutDashboard size={20} /> },
    ...(hasAnyPrivilege(userData, 'events') ? [{ name: isAr ? 'الفعاليات' : 'Events', href: '/admin/events', icon: <Calendar size={20} /> }] : []),
    ...(canViewMembers || isSuperAdmin ? [{ name: isAr ? 'الهيكلة والطلاب' : 'Structure & Students', href: '/admin/people', icon: <UsersRound size={20} /> }] : []),
    ...(canEditContent ? [{ name: isAr ? 'القوالب' : 'Templates', href: '/admin/templates', icon: <Layers size={20} /> }] : []),
    ...(canEditContent ? [{ name: isAr ? 'البريد' : 'Mail', href: '/admin/mail', icon: <Mail size={20} /> }] : []),
    ...(hasAnyPrivilege(userData, 'operations') ? [{ name: isAr ? 'مركز المهام' : 'Operations', href: '/admin/operations', icon: <Activity size={20} /> }] : []),
  ];

  // Shown at the bottom of the sidebar, separate from the main nav list.
  const footerItems = [
    { name: isAr ? 'صفحتي' : 'My page', href: '/profile', icon: <CircleUserRound size={20} /> },
    ...(isSuperAdmin || canEditContent ? [{ name: isAr ? 'الإعدادات' : 'Settings', href: '/admin/settings', icon: <Settings size={20} /> }] : []),
  ];

  const renderNavLink = (item: { name: string; href: string; icon: React.ReactNode }) => {
    const active = isCurrentPath(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setMobileOpen(false)}
        aria-label={item.name}
        aria-current={active ? 'page' : undefined}
        className={`group relative flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all ${
          isCollapsed ? 'justify-center' : ''
        } ${
          active
            ? 'bg-[#00629B] text-white shadow-md shadow-black/30 font-bold'
            : 'text-slate-300 hover:bg-white/10 hover:text-white font-medium'
        }`}
      >
        <div className="flex-shrink-0">{item.icon}</div>
        <span className={`text-sm truncate leading-none ${isCollapsed ? 'md:hidden' : ''}`}>{item.name}</span>
        {isCollapsed && (
          <span className="hidden md:group-hover:block absolute start-full ms-3 top-1/2 -translate-y-1/2 z-50 whitespace-nowrap rounded-lg bg-slate-900 text-white text-xs font-bold px-3 py-1.5 shadow-xl border border-white/10">
            {item.name}
          </span>
        )}
      </Link>
    );
  };

  return (
    <div className={`${themeClass} min-h-screen bg-[var(--color-page)] flex flex-col md:flex-row font-sans relative`}>
      {/* Decorative background shapes -- fixed to the viewport (not the document) so every
          page reads the same regardless of how tall its content is, and so they stay put
          while the page scrolls */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10" aria-hidden="true">
        <div className="absolute -top-24 -start-24 w-[28rem] h-[28rem] rounded-full bg-[var(--color-accent)]/20 blur-3xl animate-blob" />
        <div className="absolute top-1/3 -end-32 w-[24rem] h-[24rem] rounded-full bg-[var(--color-highlight)]/15 blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute bottom-0 start-1/4 w-[22rem] h-[22rem] rounded-full bg-[var(--color-accent)]/15 blur-3xl animate-blob animation-delay-4000" />
      </div>

      {/* Sidebar: floats over the background, glassmorphic, stays in view while the page scrolls */}
      <aside
        className={`sticky top-3 self-start z-10 w-full m-3 md:ms-3 md:me-0 bg-slate-900/70 backdrop-blur-xl text-white md:h-[calc(100vh-1.5rem)] rounded-3xl flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out border border-white/10 shadow-2xl ${
          isCollapsed ? 'md:w-20' : 'md:w-64'
        }`}
      >
        {/* Header & Toggle Button */}
        <div className={`border-b border-white/10 flex items-center justify-between p-3 sm:p-5 ${isCollapsed ? 'md:flex-col md:justify-center md:gap-2 md:p-3' : ''}`}>
          <div className={`truncate ${isCollapsed ? 'md:hidden' : ''}`}>
            <h2 className="text-base sm:text-lg font-black font-cairo text-[#4DA8DA] tracking-wide">
              {isAr ? 'لوحة الإدارة' : 'Admin Portal'}
            </h2>
            <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
              IEEE Qassim
            </p>
          </div>
          <div className={`flex items-center gap-1.5 ${isCollapsed ? 'md:flex-col' : ''}`}>
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
              className="hidden md:block p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all"
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
            {[...navItems, ...footerItems].map((item) => {
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
          </div>
        )}

        {/* Navigation Links */}
        <div id="admin-navigation-panel" className={`${mobileOpen ? 'flex' : 'hidden'} md:flex flex-1 flex-col min-h-0`}>
          <nav aria-label={isAr ? 'التنقل الإداري' : 'Admin navigation'} className="flex-1 p-3 space-y-1.5">
            {navItems.map(renderNavLink)}
          </nav>
          <div className="p-3 border-t border-white/10 space-y-1.5">
            {footerItems.map(renderNavLink)}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          <ConfigurationNotice />
          {children}
        </div>
      </div>
    </div>
  );
}
