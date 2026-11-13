'use client';

import { useState } from 'react';
import { Award, Crown, Medal, Trophy } from 'lucide-react';
import type { TeamLeaderboardEntry, TeamLeaderboardMember } from '@/lib/taskCenterApi';

function Podium({ members, isAr }: { members: TeamLeaderboardMember[]; isAr: boolean }) {
  const [first, second, third] = members;
  const rest = members.slice(3);
  return <div className="space-y-2">
    {first && (
      <div className="flex items-center gap-3 rounded-2xl border-2 border-amber-300 bg-gradient-to-l from-amber-50 to-amber-100/60 p-3">
        <Crown className="shrink-0 text-amber-500" size={20} />
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-black text-white">{first.name.trim().charAt(0) || '?'}</div>
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{first.name}</p></div>
        <span className="shrink-0 text-sm font-black text-amber-700">{first.totalPoints} {isAr ? 'نقطة' : 'pts'}</span>
      </div>
    )}
    {(second || third) && (
      <div className="grid grid-cols-2 gap-2">
        {[second, third].map((member, i) => member && (
          <div key={member.userId} className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)]/60 p-2.5">
            <Medal size={15} className={i === 0 ? 'text-slate-400' : 'text-amber-700'} />
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-[10px] font-black text-[var(--color-accent)]">{member.name.trim().charAt(0) || '?'}</div>
            <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{member.name}</p></div>
            <span className="shrink-0 text-xs font-black text-[var(--color-text-secondary)]">{member.totalPoints}</span>
          </div>
        ))}
      </div>
    )}
    {rest.length > 0 && (
      <ol className="space-y-1 pt-1">
        {rest.map((member, i) => (
          <li key={member.userId} className="flex items-center justify-between rounded-lg px-2 py-1 text-xs">
            <span className="text-[var(--color-text-muted)]">#{i + 4} {member.name}</span>
            <span className="font-bold">{member.totalPoints} {isAr ? 'نقطة' : 'pts'}</span>
          </li>
        ))}
      </ol>
    )}
  </div>;
}

export default function TeamLeaderboardPanel({ teams, isAr }: { teams: TeamLeaderboardEntry[]; isAr: boolean }) {
  const t = (ar: string, en: string) => isAr ? ar : en;
  const [tab, setTab] = useState<'summary' | string>('summary');
  const withMembers = teams.filter(team => team.members.length > 0);

  return <div className="rounded-3xl border border-[var(--color-border)]/50 bg-[var(--color-surface)]/80 backdrop-blur-md p-5 shadow-xs">
    <h2 className="mb-1 flex items-center gap-2 text-base font-black font-cairo">
      <Trophy size={18} className="text-amber-500" />{t('لائحة المتصدرين', 'Leaderboard')}
    </h2>
    <p className="mb-3 text-xs text-[var(--color-text-muted)]">{t('شكرًا لجهودكم مع الفريق، هذا مكان لإنجازاتكم', 'Thanks for your efforts with the team — this is a place for your achievements')}</p>

    <div className="mb-3 flex flex-wrap gap-1.5 overflow-x-auto pb-1">
      <button type="button" onClick={() => setTab('summary')}
              className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-bold ${tab === 'summary' ? 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)]' : 'bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]'}`}>
        {t('ملخص الأقسام', 'Departments summary')}
      </button>
      {withMembers.map(team => (
        <button key={team.id} type="button" onClick={() => setTab(team.id)}
                className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-bold ${tab === team.id ? 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)]' : 'bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]'}`}>
          {isAr ? team.nameAr : team.nameEn}
        </button>
      ))}
    </div>

    {tab === 'summary' ? (
      <div className="space-y-4 max-h-[26rem] overflow-y-auto pe-1">
        {withMembers.map(team => (
          <div key={team.id}>
            <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-[var(--color-text-muted)]">
              <span>{isAr ? team.nameAr : team.nameEn}</span>
              <span>{team.members.length} {t('من أعضاء الفريق في القائمة', 'team members ranked')}</span>
            </div>
            <Podium members={[...team.members].sort((a, b) => b.totalPoints - a.totalPoints).slice(0, 3)} isAr={isAr} />
          </div>
        ))}
        {withMembers.length === 0 && <p className="py-6 text-center text-sm text-[var(--color-text-muted)]"><Award size={22} className="mx-auto mb-2 text-[var(--color-text-muted)]" />{t('لا يوجد أعضاء في الفرق بعد.', 'No team members yet.')}</p>}
      </div>
    ) : (() => {
      const team = withMembers.find(tm => tm.id === tab);
      if (!team) return null;
      return <Podium members={[...team.members].sort((a, b) => b.totalPoints - a.totalPoints)} isAr={isAr} />;
    })()}
  </div>;
}
