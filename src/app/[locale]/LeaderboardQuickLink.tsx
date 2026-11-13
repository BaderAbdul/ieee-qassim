'use client';

import { Trophy, ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useAuth, isAdminRole } from '@/context/AuthContext';

// Mirrors LeaderboardGuard: admin-tier accounts don't compete on student points, so the homepage
// quick-link to the (otherwise student-only) leaderboard is hidden for them too.
export default function LeaderboardQuickLink({ label, description }: { label: string; description: string }) {
  const { userData } = useAuth();
  if (isAdminRole(userData)) return null;

  return (
    <Link href="/leaderboard" className="bg-gradient-to-b from-white to-slate-50 rounded-2xl px-2 py-4 sm:p-8 shadow-sm hover:shadow-lg hover:shadow-amber-500/10 border border-slate-200/80 hover:border-amber-300 flex flex-col items-center justify-center text-center hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden">
      <div className="absolute top-1.5 sm:top-3 end-1.5 sm:end-3 text-slate-300 group-hover:text-amber-500 transition-colors">
        <ArrowRight className="w-3.5 h-3.5 sm:w-5 sm:h-5 rtl:-scale-x-100" />
      </div>
      <div className="w-11 h-11 sm:w-16 sm:h-16 bg-amber-50 text-amber-600 rounded-xl sm:rounded-2xl flex items-center justify-center mb-2 sm:mb-4 group-hover:bg-amber-100 group-hover:scale-110 transition-all duration-300 shadow-inner">
        <Trophy className="w-5 h-5 sm:w-8 sm:h-8" />
      </div>
      <h3 className="text-slate-900 font-black text-xs sm:text-xl leading-tight group-hover:text-amber-700 transition-colors">{label}</h3>
      <p className="hidden sm:block text-slate-500 text-sm mt-2">{description}</p>
    </Link>
  );
}
