'use client';

import { useEffect } from 'react';
import { useAuth, isAdminRole } from '@/context/AuthContext';
import { useRouter } from '@/i18n/routing';

// Leaderboard ranks student participation points; admin-tier accounts (member/event_organizer/
// super_admin) manage that data rather than compete on it, so they're redirected away.
export default function LeaderboardGuard({ children }: { children: React.ReactNode }) {
  const { userData, loading } = useAuth();
  const router = useRouter();
  const blocked = !loading && isAdminRole(userData);

  useEffect(() => {
    if (blocked) router.replace('/');
  }, [blocked, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" role="status" />
      </div>
    );
  }

  if (blocked) return null;

  return <>{children}</>;
}
