'use client';

import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from '@/i18n/routing';
import { safeReturnTo } from '@/lib/studentExperience';

export default function ProfileGuard({ children }: { children: React.ReactNode }) {
  const { user, userData, loading, error, logout, retry } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && user && userData) {
      // Super admins do not need to complete profile
      if (userData.role === 'super_admin') {
        if (pathname.includes('/complete-profile')) {
          router.replace(safeReturnTo(new URLSearchParams(window.location.search).get('returnTo')));
        }
        return;
      }

      // If profile is not completed and they are not on the complete-profile page
      if (userData.profileCompleted === false && !pathname.includes('/complete-profile')) {
        const destination = safeReturnTo(`${pathname}${window.location.search}${window.location.hash}`);
        router.replace(`/complete-profile?returnTo=${encodeURIComponent(destination)}`);
      }
      
      // If profile is completed and they try to go to the onboarding page
      if (userData.profileCompleted === true && pathname.includes('/complete-profile')) {
        router.replace(safeReturnTo(new URLSearchParams(window.location.search).get('returnTo')));
      }
    }
  }, [user, userData, loading, pathname, router]);

  if (error || userData?.isRestricted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center" role="alert">
        <p>{error || 'حسابك مقيد. تواصل مع الإدارة. / Your account is restricted. Contact the organizer.'}</p>
        <button className="rounded-xl bg-blue-600 px-5 py-3 text-white" onClick={() => error ? retry() : void logout()}>
          {error ? 'إعادة المحاولة / Retry' : 'تسجيل الخروج / Sign out'}
        </button>
      </div>
    );
  }

  // Prevent flashing of unauthorized content
  if (!loading && user && userData && userData.role !== 'super_admin' && userData?.profileCompleted === false && !pathname.includes('/complete-profile')) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p role="status">جاري فتح صفحة إكمال الملف / Opening your profile setup...</p>
      </div>
    );
  }

  return <>{children}</>;
}
