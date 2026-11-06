'use client';

import { useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { useAuth, hasAnyPrivilege } from '@/context/AuthContext';
import { AdminError } from '@/components/admin/AdminData';
import AdminTabs, { type AdminTab } from '@/components/admin/AdminTabs';
import { useAdminTopbarActions } from '@/components/admin/AdminTopbarActions';
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

  const [activeKey, setActiveKey] = useState(tabs[0]?.key);
  const tabsSignature = tabs.map(t => `${t.key}:${t.label}`).join('|');

  const topbarActions = useMemo(() => (
    <>
      {tabs.map(tab => (
        <button
          key={tab.key}
          type="button"
          onClick={() => setActiveKey(tab.key)}
          aria-current={tab.key === activeKey ? 'page' : undefined}
          className={`cursor-pointer rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
            tab.key === activeKey
              ? 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)]'
              : 'bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </>
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [tabsSignature, activeKey]);
  useAdminTopbarActions(topbarActions);

  if (!tabs.length) {
    return <AdminError message={isAr ? 'لا تملك صلاحية للوصول إلى هذه الصفحة.' : "You don't have access to this page."} />;
  }

  return <AdminTabs tabs={tabs} activeKey={activeKey ?? tabs[0]?.key} onActiveKeyChange={setActiveKey} hideTabBar />;
}
