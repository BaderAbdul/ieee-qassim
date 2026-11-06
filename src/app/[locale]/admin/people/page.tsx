'use client';

import { useLocale } from 'next-intl';
import { useAuth, hasAnyPrivilege } from '@/context/AuthContext';
import { AdminError } from '@/components/admin/AdminData';
import AdminTabs, { type AdminTab } from '@/components/admin/AdminTabs';
import AdminTeamsPage from '../teams/page';
import AdminUsersPage from '../users/page';

export default function AdminPeoplePage() {
  const isAr = useLocale() === 'ar';
  const { userData } = useAuth();
  const isSuperAdmin = userData?.isSuperAdmin === true || userData?.role === 'super_admin';
  const canViewMembers = hasAnyPrivilege(userData, 'members');

  const tabs: AdminTab[] = [
    ...(isSuperAdmin ? [{ key: 'teams', label: isAr ? 'الفرق' : 'Teams', content: <AdminTeamsPage /> }] : []),
    ...(canViewMembers ? [{ key: 'users', label: isAr ? 'المسجلون والطلاب' : 'Users & Members', content: <AdminUsersPage /> }] : []),
  ];

  if (!tabs.length) {
    return <AdminError message={isAr ? 'لا تملك صلاحية للوصول إلى هذه الصفحة.' : "You don't have access to this page."} />;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] font-cairo">{isAr ? 'الهيكلة والطلاب' : 'Structure & Students'}</h1>
      </header>
      <AdminTabs tabs={tabs} />
    </div>
  );
}
