'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from '@/i18n/routing';
import { useEffect } from 'react';
import { Link } from '@/i18n/routing';
import { LayoutDashboard, Calendar, Users, QrCode, LogOut } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, userData, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/');
      } else if (userData?.role !== 'super_admin' && userData?.role !== 'event_organizer') {
        router.push('/');
      }
    }
  }, [user, userData, loading, router]);

  if (loading || !user || (userData?.role !== 'super_admin' && userData?.role !== 'event_organizer')) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div></div>;
  }

  const isCurrentPath = (path: string) => {
    // pathname might look like /ar/admin/events, we check if it includes the path
    // simple check for now
    if (path === '/admin') {
      return pathname.endsWith('/admin');
    }
    return pathname.includes(path);
  };

  const navItems = [
    { name: 'نظرة عامة', href: '/admin', icon: <LayoutDashboard size={20} /> },
    { name: 'إدارة الفعاليات', href: '/admin/events', icon: <Calendar size={20} /> },
    { name: 'المسجلون والطلاب', href: '/admin/users', icon: <Users size={20} /> },
    { name: 'تسجيل الحضور (QR)', href: '/admin/check-in', icon: <QrCode size={20} /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 text-white md:min-h-screen flex flex-col flex-shrink-0">
        <div className="p-6">
          <h2 className="text-xl font-bold font-cairo text-purple-400">لوحة الإدارة</h2>
          <p className="text-slate-400 text-xs mt-1">Tech Community Platform</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const active = isCurrentPath(item.href);
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`flex items-center space-x-3 space-x-reverse px-4 py-3 rounded-lg transition-colors ${
                  active ? 'bg-purple-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {item.icon}
                <span className="font-medium text-sm">{item.name}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <Link href="/" className="flex items-center space-x-3 space-x-reverse px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
            <LogOut size={20} className="rtl:rotate-180" />
            <span className="font-medium text-sm">العودة للمنصة</span>
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
