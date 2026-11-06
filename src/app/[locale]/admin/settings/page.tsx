'use client';

import { useLocale } from 'next-intl';
import { useAuth } from '@/context/AuthContext';
import { AdminError } from '@/components/admin/AdminData';
import AdminTabs, { type AdminTab } from '@/components/admin/AdminTabs';
import AdminRolesPage from '../roles/page';
import AdminContentPage from '../content/page';
import AdminMaintenancePage from '../maintenance/page';
import AdminBadgesPage from '../badges/page';
import AdminAuditPage from '../audit/page';

export default function AdminSettingsPage() {
  const isAr = useLocale() === 'ar';
  const { userData } = useAuth();
  const isSuperAdmin = userData?.isSuperAdmin === true || userData?.role === 'super_admin';
  const canEditContent = isSuperAdmin || (userData?.privileges ?? []).some((key) => key.startsWith('content.'));

  const tabs: AdminTab[] = [
    ...(isSuperAdmin ? [{ key: 'roles', label: isAr ? 'الأدوار والصلاحيات' : 'Roles & Privileges', content: <AdminRolesPage /> }] : []),
    ...(canEditContent ? [{ key: 'content', label: isAr ? 'محتوى الموقع' : 'Site content', content: <AdminContentPage /> }] : []),
    ...(isSuperAdmin ? [{ key: 'maintenance', label: isAr ? 'وضع الصيانة' : 'Maintenance mode', content: <AdminMaintenancePage /> }] : []),
    ...(isSuperAdmin ? [{ key: 'badges', label: isAr ? 'الأوسمة الإدارية' : 'Admin Badges', content: <AdminBadgesPage /> }] : []),
    ...(isSuperAdmin ? [{ key: 'audit', label: isAr ? 'سجل الإجراءات' : 'Audit log', content: <AdminAuditPage /> }] : []),
  ];

  if (!tabs.length) {
    return <AdminError message={isAr ? 'لا تملك صلاحية للوصول إلى الإعدادات.' : "You don't have access to settings."} />;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] font-cairo">{isAr ? 'الإعدادات' : 'Settings'}</h1>
      </header>
      <AdminTabs tabs={tabs} />
    </div>
  );
}
