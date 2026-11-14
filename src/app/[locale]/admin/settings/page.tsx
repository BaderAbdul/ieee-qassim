'use client';

import { useLocale } from 'next-intl';
import { hasPrivilege, useAuth } from '@/context/AuthContext';
import { AdminError } from '@/components/admin/AdminData';
import AdminTabs, { type AdminTab } from '@/components/admin/AdminTabs';
import AdminRolesPage from '../roles/page';
import AdminContentPage from '../content/page';
import AdminMaintenancePage from '../maintenance/page';
import AdminBadgesPage from '../badges/page';
import AdminAuditPage from '../audit/page';
import AdminAcademicTermPage from '../academic-term/page';
import AdminEventProcessTeamsPage from '../event-process-teams/page';
import EmailSettings from '@/components/admin/EmailSettings';
import OnboardingSettings from '@/components/admin/onboarding/OnboardingSettings';
import EventAutomationSettings from '@/components/admin/EventAutomationSettings';
import MessagesComposer from '@/components/admin/messages/MessagesComposer';

export default function AdminSettingsPage() {
  const isAr = useLocale() === 'ar';
  const { userData } = useAuth();
  const isSuperAdmin = userData?.isSuperAdmin === true || userData?.role === 'super_admin';
  const canEditContent = hasPrivilege(userData, 'content.update');
  const canEditAcademicCalendar = hasPrivilege(userData, 'academic_calendar.update');

  const tabs: AdminTab[] = [
    ...(isSuperAdmin || userData?.canManageEmail ? [{ key: 'email-sender', label: isAr ? 'البريد المرسل' : 'Email sender', content: <EmailSettings /> }] : []),
    ...(isSuperAdmin || canEditContent ? [{ key: 'event-automation', label: isAr ? 'أتمتة الفعاليات' : 'Event automation', content: <EventAutomationSettings /> }] : []),
    ...(isSuperAdmin ? [{ key: 'messages', label: isAr ? 'رسائل الإدارة' : 'Staff messages', content: <MessagesComposer /> }] : []),
    ...(isSuperAdmin ? [{ key: 'onboarding', label: isAr ? 'الدخول الأول والتطبيق' : 'First sign-in & app', content: <OnboardingSettings /> }] : []),
    ...(isSuperAdmin ? [{ key: 'roles', label: isAr ? 'الأدوار والحد الأدنى للصلاحيات' : 'Roles & minimum privileges', content: <AdminRolesPage /> }] : []),
    ...(canEditContent ? [{ key: 'content', label: isAr ? 'محتوى الموقع' : 'Site content', content: <AdminContentPage /> }] : []),
    ...(canEditAcademicCalendar ? [{ key: 'academic-term', label: isAr ? 'الفصل الدراسي' : 'Academic term', content: <AdminAcademicTermPage /> }] : []),
    ...(isSuperAdmin ? [{ key: 'event-process-teams', label: isAr ? 'فرق مراحل الفعاليات' : 'Event process teams', content: <AdminEventProcessTeamsPage /> }] : []),
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
