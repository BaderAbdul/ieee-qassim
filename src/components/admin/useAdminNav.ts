import { hasAnyPrivilege, type UserData } from '@/context/AuthContext';
import {
  LayoutDashboard,
  Calendar,
  Settings,
  Activity,
  UsersRound,
  Mail,
  Layers,
  CircleUserRound,
} from 'lucide-react';
import type { ComponentType } from 'react';

export interface AdminNavItem {
  name: string;
  href: string;
  icon: ComponentType<{ size?: number }>;
}

/** Single source of truth for the admin sidebar's nav list, also reused by the topbar search. */
export function useAdminNav(userData: UserData | null, isAr: boolean) {
  const isSuperAdmin = userData?.isSuperAdmin === true || userData?.role === 'super_admin';
  const canEditContent = hasAnyPrivilege(userData, 'content');
  const canViewMembers = hasAnyPrivilege(userData, 'members');

  if (userData?.role === 'student' && userData.canReviewTemplates) {
    return {
      navItems: [
        { name: isAr ? 'القوالب' : 'Templates', href: '/admin/templates', icon: Layers },
        ...(userData.canManageEmail ? [{ name: isAr ? 'البريد' : 'Mail', href: '/admin/mail', icon: Mail }] : []),
      ],
      footerItems: [
        { name: isAr ? 'صفحتي' : 'My page', href: '/profile', icon: CircleUserRound },
        ...(userData.canManageEmail ? [{ name: isAr ? 'الإعدادات' : 'Settings', href: '/admin/settings', icon: Settings }] : []),
      ],
      isSuperAdmin, canEditContent, canViewMembers,
    };
  }

  const navItems: AdminNavItem[] = [
    { name: isAr ? 'الرئيسية' : 'Home', href: '/admin', icon: LayoutDashboard },
    ...(hasAnyPrivilege(userData, 'events') ? [{ name: isAr ? 'الفعاليات' : 'Events', href: '/admin/events', icon: Calendar }] : []),
    ...(canViewMembers || isSuperAdmin ? [{ name: isAr ? 'الهيكلة والطلاب' : 'Structure & Students', href: '/admin/people', icon: UsersRound }] : []),
    ...(canEditContent || userData?.canReviewTemplates ? [{ name: isAr ? 'القوالب' : 'Templates', href: '/admin/templates', icon: Layers }] : []),
    ...(isSuperAdmin || userData?.canManageEmail || userData?.privileges?.includes('operations.update') ? [{ name: isAr ? 'البريد' : 'Mail', href: '/admin/mail', icon: Mail }] : []),
    ...(hasAnyPrivilege(userData, 'operations') ? [{ name: isAr ? 'مركز المهام' : 'Operations', href: '/admin/operations', icon: Activity }] : []),
  ];

  const footerItems: AdminNavItem[] = [
    { name: isAr ? 'صفحتي' : 'My page', href: '/profile', icon: CircleUserRound },
    ...(isSuperAdmin || canEditContent || userData?.canManageEmail ? [{ name: isAr ? 'الإعدادات' : 'Settings', href: '/admin/settings', icon: Settings }] : []),
  ];

  return { navItems, footerItems, isSuperAdmin, canEditContent, canViewMembers };
}

/** A few curated jump-to-operations shortcuts for the topbar search; not a full index. */
export function operationsShortcuts(isAr: boolean) {
  return [
    { name: isAr ? 'التسجيلات المعلقة' : 'Pending registrations', href: '/admin/events' },
    { name: isAr ? 'الشهادات الفاشلة أو قيد التجهيز' : 'Failed / queued certificates', href: '/admin/operations' },
    { name: isAr ? 'البريد الفاشل أو بحاجة مراجعة' : 'Failed / review mail', href: '/admin/operations' },
    { name: isAr ? 'سجل الإجراءات' : 'Audit log', href: '/admin/settings' },
  ];
}
