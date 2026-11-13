'use client';

import { useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import {
  BookOpen, Briefcase, LayoutDashboard, Lightbulb, ListTodo, MessageSquare, Target,
} from 'lucide-react';
import { hasAnyPrivilegeOf, hasPrivilege, useAuth } from '@/context/AuthContext';
import { useAdminTopbarActions } from '@/components/admin/AdminTopbarActions';
import TaskCenterOverviewTab from '@/components/admin/operations/TaskCenterOverviewTab';
import TaskCenterProjectsTab from '@/components/admin/operations/TaskCenterProjectsTab';
import TaskCenterTasksTab from '@/components/admin/operations/TaskCenterTasksTab';
import TaskCenterGoalsTab from '@/components/admin/operations/TaskCenterGoalsTab';
import TaskCenterCheckinTab from '@/components/admin/operations/TaskCenterCheckinTab';
import TaskCenterIdeasTab from '@/components/admin/operations/TaskCenterIdeasTab';
import TaskCenterResourcesTab from '@/components/admin/operations/TaskCenterResourcesTab';

type TabId = 'overview' | 'projects' | 'tasks' | 'goals' | 'checkin' | 'ideas' | 'resources';
const TAB_IDS: TabId[] = ['overview', 'projects', 'tasks', 'goals', 'checkin', 'ideas', 'resources'];

export default function AdminOperationsPage() {
  const isAr = useLocale() === 'ar';
  const { userData } = useAuth();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab');
  const [tab, setTab] = useState<TabId>(
    TAB_IDS.includes(initialTab as TabId) ? (initialTab as TabId) : 'overview');
  const initialProjectId = searchParams.get('projectId');
  const initialAssigneeId = searchParams.get('assigneeId');
  const initialTeamId = searchParams.get('teamId');
  const canModerate = hasPrivilege(userData, 'ideas.update');

  const allTabs: { id: TabId; labelAr: string; labelEn: string; Icon: typeof LayoutDashboard; allowed: boolean }[] = [
    { id: 'overview', labelAr: 'نظرة عامة', labelEn: 'Overview', Icon: LayoutDashboard, allowed: hasAnyPrivilegeOf(userData, 'operations', 'tasks') },
    { id: 'projects', labelAr: 'المشاريع', labelEn: 'Projects', Icon: Briefcase, allowed: hasPrivilege(userData, 'projects.read') },
    { id: 'tasks', labelAr: 'المهام', labelEn: 'Tasks', Icon: ListTodo, allowed: hasPrivilege(userData, 'tasks.read') },
    { id: 'goals', labelAr: 'الأهداف', labelEn: 'Goals', Icon: Target, allowed: hasPrivilege(userData, 'goals.read') },
    { id: 'checkin', labelAr: 'تسجيل الحضور', labelEn: 'Check-in', Icon: MessageSquare, allowed: hasPrivilege(userData, 'operations.read') },
    { id: 'ideas', labelAr: 'بنك الأفكار', labelEn: 'Idea Bank', Icon: Lightbulb, allowed: hasPrivilege(userData, 'ideas.read') },
    { id: 'resources', labelAr: 'الموارد', labelEn: 'Resources', Icon: BookOpen, allowed: hasPrivilege(userData, 'operations.read') },
  ];
  const tabs = allTabs.filter(item => item.allowed);
  const active = tabs.some(item => item.id === tab) ? tab : tabs[0]?.id;

  const topbarActions = useMemo(() => (
    <div className="flex flex-wrap items-center gap-1 rounded-xl bg-white/10 p-1">
      {tabs.map(({ id, labelAr, labelEn, Icon }) => (
        <button key={id} type="button" onClick={() => setTab(id)} title={isAr ? labelAr : labelEn}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-all ${active === id ? 'bg-[#00629B] text-white shadow' : 'text-slate-300'}`}>
          <Icon size={14} /><span className="hidden lg:inline">{isAr ? labelAr : labelEn}</span>
        </button>
      ))}
    </div>
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [active, isAr]);
  useAdminTopbarActions(topbarActions);

  if (!active) return <p role="alert">{isAr ? 'لا تملك صلاحية لأي قسم في مركز المهام.' : 'You do not have access to any Task Center section.'}</p>;

  return <div className="space-y-6">
    {active === 'overview' && <TaskCenterOverviewTab isAr={isAr} />}
    {active === 'projects' && <TaskCenterProjectsTab isAr={isAr} />}
    {active === 'tasks' && <TaskCenterTasksTab isAr={isAr} initialProjectId={initialProjectId ? Number(initialProjectId) : null} initialAssigneeId={initialAssigneeId} initialTeamId={initialTeamId} />}
    {active === 'goals' && <TaskCenterGoalsTab isAr={isAr} />}
    {active === 'checkin' && <TaskCenterCheckinTab isAr={isAr} />}
    {active === 'ideas' && <TaskCenterIdeasTab isAr={isAr} canModerate={canModerate} />}
    {active === 'resources' && <TaskCenterResourcesTab isAr={isAr} />}
  </div>;
}
