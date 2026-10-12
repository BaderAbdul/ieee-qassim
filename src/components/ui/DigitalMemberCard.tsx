'use client';

import React, { useId, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck, Calendar, Trophy, Zap, Edit2, LogOut, Hexagon, Link as LinkIcon, QrCode, ChevronDown } from 'lucide-react';
import Image from 'next/image';
import { useLocale } from 'next-intl';
import type { User } from 'firebase/auth';
import { SITE_URL } from '@/lib/site';
import { memberMajorLabel, memberPassUrl, memberRankLabel, type MemberRankState } from '@/lib/memberPresentation';

interface DigitalMemberCardProps {
  user: User;
  userData: {
    arabicFullName?: string;
    name?: string;
    major?: string | null;
    college?: string | null;
    publicProfile?: { linkedin?: string };
    cardPreferences?: { theme?: string; pattern?: string };
  } | null;
  rank: number | null;
  rankState?: MemberRankState;
  totalPoints: number;
  onEditName?: () => void;
  onEditProfile?: () => void;
  onLogout?: () => void;
  isPublicView?: boolean;
  showQr?: boolean;
}

const themes: Record<string, string> = {
  emerald: 'from-emerald-500 to-teal-500', gold: 'from-amber-400 to-orange-500',
  purple: 'from-purple-500 to-fuchsia-500', rose: 'from-rose-500 to-pink-500', blue: 'from-blue-500 to-indigo-500',
};
const patterns: Record<string, string> = {
  dots: 'bg-[radial-gradient(#ffffff22_1px,transparent_1px)] [background-size:16px_16px]',
  grid: 'bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] [background-size:24px_24px]',
  waves: 'bg-[repeating-radial-gradient(circle_at_0_0,transparent_0,#ffffff05_10px,transparent_20px)]',
};

export default function DigitalMemberCard({ user, userData, rank, rankState = rank ? 'ready' : 'unranked', totalPoints, onEditName, onEditProfile, onLogout, isPublicView = false, showQr = isPublicView }: DigitalMemberCardProps) {
  const locale = useLocale();
  const isAr = locale === 'ar';
  const [qrExpanded, setQrExpanded] = useState(showQr);
  const qrId = useId();
  if (!user) return null;

  const label = (en: string, ar: string) => isAr ? ar : en;
  const displayName = userData?.arabicFullName || userData?.name || user.displayName || label('Member', 'عضو');
  const joinDate = user.metadata?.creationTime ? new Date(user.metadata.creationTime).getFullYear() : new Date().getFullYear();
  const theme = themes[userData?.cardPreferences?.theme || 'blue'] || themes.blue;
  const pattern = patterns[userData?.cardPreferences?.pattern || 'none'] || '';
  let linkedinUrl: string | undefined;
  try {
    const parsed = new URL(userData?.publicProfile?.linkedin || '');
    if (parsed.protocol === 'https:') linkedinUrl = parsed.href;
  } catch { /* Hide incomplete profile links. */ }

  return (
    <section aria-label={label('Member summary', 'ملخص العضوية')} className={`relative overflow-hidden rounded-3xl border border-slate-800 bg-[#0B1121] text-white shadow-lg ${pattern}`}>
      <div className="relative p-5 sm:p-7">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-blue-200">
            <Hexagon className="h-4 w-4" aria-hidden="true" />
            <span className="text-xs font-bold tracking-wider">IEEE QU PASS</span>
            <span className="rounded-full bg-emerald-400/15 px-2 py-1 text-xs text-emerald-200">{label('Member', 'عضو')}</span>
          </div>
          {onLogout && !isPublicView && <button type="button" onClick={onLogout} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-200 hover:bg-white/10">
            <LogOut className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />{label('Sign out', 'تسجيل الخروج')}
          </button>}
        </div>
        <div className="mb-5 flex items-start gap-4">
          <div className={`relative h-16 w-16 shrink-0 rounded-2xl bg-gradient-to-tr ${theme} p-1 sm:h-20 sm:w-20`}>
            <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-xl bg-slate-900 text-2xl font-bold">
              {user.photoURL ? <Image src={user.photoURL} alt="" fill sizes="80px" className="object-cover" /> : displayName.charAt(0)}
            </div>
            <ShieldCheck className="absolute -bottom-1 -end-1 h-6 w-6 rounded-full bg-slate-900 p-1 text-emerald-300" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="break-words text-xl font-bold leading-relaxed sm:text-2xl">{displayName}</h2>
            <p className="mt-1 break-words text-sm text-blue-200">{memberMajorLabel(userData?.major, isAr)}</p>
          </div>
        </div>
        <dl className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">
          <div className="text-center"><dt className="mb-2 flex items-center justify-center gap-1.5 text-xs text-slate-300"><Trophy className="h-4 w-4 text-amber-300" aria-hidden="true" />{label('Points', 'النقاط')}</dt><dd className="text-xl font-bold">{totalPoints}</dd></div>
          <div className="border-x border-white/10 text-center"><dt className="mb-2 flex items-center justify-center gap-1.5 text-xs text-slate-300"><Zap className="h-4 w-4 text-emerald-300" aria-hidden="true" />{label('Rank', 'المركز')}</dt><dd aria-live="polite" className={rankState === 'ready' ? 'text-xl font-bold' : 'text-xs font-semibold leading-7'}>{memberRankLabel(rankState, rank, isAr)}</dd></div>
          <div className="text-center"><dt className="mb-2 flex items-center justify-center gap-1.5 text-xs text-slate-300"><Calendar className="h-4 w-4 text-blue-300" aria-hidden="true" />{label('Joined', 'انضمام')}</dt><dd className="text-xl font-bold">{joinDate}</dd></div>
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          {!isPublicView && onEditName && <button type="button" onClick={onEditName} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white/5 px-3 text-sm font-semibold text-slate-200 hover:bg-white/10"><Edit2 className="h-4 w-4" aria-hidden="true" />{label('Edit name', 'تعديل الاسم')}</button>}
          {!isPublicView && onEditProfile && <button type="button" onClick={onEditProfile} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white/5 px-3 text-sm font-semibold text-slate-200 hover:bg-white/10"><Edit2 className="h-4 w-4" aria-hidden="true" />{label('Edit profile', 'تعديل البيانات')}</button>}
          {linkedinUrl && <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white/5 px-3 text-sm font-semibold text-slate-200 hover:bg-white/10"><LinkIcon className="h-4 w-4" aria-hidden="true" />LinkedIn</a>}
          {!showQr && <button type="button" aria-expanded={qrExpanded} aria-controls={qrId} onClick={() => setQrExpanded(value => !value)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-500/20 px-3 text-sm font-semibold text-blue-100 hover:bg-blue-500/30"><QrCode className="h-4 w-4" aria-hidden="true" />{qrExpanded ? label('Hide membership QR', 'إخفاء رمز العضوية') : label('Show membership QR', 'عرض رمز العضوية')}<ChevronDown className={`h-4 w-4 ${qrExpanded ? 'rotate-180' : ''}`} aria-hidden="true" /></button>}
        </div>
      </div>
      {qrExpanded && <div id={qrId} className="flex flex-col items-center gap-3 border-t border-dashed border-white/15 bg-white/5 p-6">
        <div className="rounded-2xl bg-white p-4"><QRCodeSVG value={memberPassUrl(SITE_URL, locale, user.uid)} size={168} bgColor="#ffffff" fgColor="#0f172a" level="Q" marginSize={4} title={label('Open public member pass', 'فتح بطاقة العضو العامة')} /></div>
        <p className="text-sm text-slate-200">{label('Present this QR at the check-in desk.', 'أبرز هذا الرمز لمكتب التحضير.')}</p>
        <p className="text-xs text-slate-300">{label('Member ID', 'معرّف العضوية')}: <bdi className="font-mono">{user.uid.substring(0, 10)}</bdi></p>
      </div>}
    </section>
  );
}
