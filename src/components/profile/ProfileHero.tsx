'use client';

import { EyeOff, GraduationCap, Pencil, ShieldCheck, Users, AlertTriangle } from 'lucide-react';
import { isAdminRole, type AuthUser, type UserData } from '@/context/AuthContext';
import { socialLinks } from './socials';

export default function ProfileHero({ user, userData, isAr, onEdit }: {
  user: AuthUser; userData: UserData | null; isAr: boolean; onEdit: () => void;
}) {
  const staff = isAdminRole(userData);
  const showAvatar = userData?.publicProfile?.showAvatar !== false;
  const photo = userData?.publicProfile?.avatar || userData?.photoURL || user.photoURL || '';
  const arabicName = userData?.arabicFullName || userData?.displayName || user.displayName || '';
  const englishName = userData?.englishFullName || '';
  const title = isAr ? (userData?.titleAr || userData?.titleEn) : (userData?.titleEn || userData?.titleAr);
  const roleLabel = isAr ? (userData?.roleNameAr || userData?.role) : (userData?.roleNameEn || userData?.role);
  const links = socialLinks(userData?.publicProfile);
  const missingEnglish = staff && !englishName;
  const initials = (englishName || arabicName || '?').trim().charAt(0).toUpperCase();

  return (
    <section className="relative overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
      <div className="h-28 bg-gradient-to-l from-[#00629B] via-[#0a7bbd] to-[#0b3d66] sm:h-36">
        <div className="h-full w-full opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, #fff 0, transparent 40%), radial-gradient(circle at 80% 70%, #fff 0, transparent 35%)' }} />
      </div>
      <div className="px-5 pb-6 sm:px-8">
        <div className="-mt-12 flex flex-wrap items-end justify-between gap-4 sm:-mt-14">
          <div className="relative">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl border-4 border-white bg-[var(--color-surface-2)] text-3xl font-black text-[var(--color-text-muted)] shadow-lg sm:h-28 sm:w-28">
              {photo && showAvatar
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={photo} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                : initials}
            </div>
            {!showAvatar && (
              <span title={isAr ? 'صورتك مخفية عن الآخرين' : 'Your photo is hidden from others'}
                    className="absolute -bottom-1 -end-1 flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-white shadow">
                <EyeOff className="h-3.5 w-3.5" />
              </span>
            )}
          </div>
          <button type="button" onClick={onEdit}
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[var(--color-accent-strong)]">
            <Pencil className="h-4 w-4" />{isAr ? 'تعديل الملف الشخصي' : 'Edit profile'}
          </button>
        </div>

        <div className="mt-4 space-y-1">
          <h1 className="font-cairo text-2xl font-black text-[var(--color-text-primary)] sm:text-3xl">{arabicName}</h1>
          {englishName && <p dir="ltr" className="text-start text-base font-semibold text-[var(--color-text-secondary)]">{englishName}</p>}
          {title && <p className="text-sm font-bold text-[var(--color-accent)]">{title}</p>}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold">
          {roleLabel && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent-soft)] px-3 py-1 text-[var(--color-accent)]">
              {staff ? <ShieldCheck className="h-3.5 w-3.5" /> : <GraduationCap className="h-3.5 w-3.5" />}{roleLabel}
            </span>
          )}
          {(userData?.teams ?? []).map(team => (
            <span key={team.id} className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-surface-2)] px-3 py-1 text-[var(--color-text-secondary)]">
              <Users className="h-3.5 w-3.5" />{isAr ? team.nameAr : team.nameEn}{team.isLeader ? (isAr ? ' · قائد' : ' · Leader') : ''}
            </span>
          ))}
          {userData?.college && <span className="rounded-full bg-[var(--color-surface-2)] px-3 py-1 text-[var(--color-text-secondary)]">{userData.college}</span>}
          {userData?.academicLevel && <span className="rounded-full bg-[var(--color-surface-2)] px-3 py-1 text-[var(--color-text-secondary)]">{userData.academicLevel}</span>}
        </div>

        {userData?.publicProfile?.bio && <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--color-text-secondary)]">{userData.publicProfile.bio}</p>}

        {links.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {links.map(({ key, url, Icon, labelAr, labelEn }) => (
              <a key={key} href={url} target="_blank" rel="noopener noreferrer" title={isAr ? labelAr : labelEn}
                 className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] transition hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-contrast)]">
                <Icon className="h-4 w-4" /><span className="sr-only">{isAr ? labelAr : labelEn}</span>
              </a>
            ))}
          </div>
        )}

        {missingEnglish && (
          <button type="button" onClick={onEdit}
                  className="mt-4 flex w-full items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-start text-xs font-bold text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {isAr ? 'أضف اسمك الكامل بالإنجليزية — مطلوب لحسابات الإدارة ويظهر في صفحة الهيكلة.' : 'Add your full name in English — required for staff accounts and shown on the Structure page.'}
          </button>
        )}
      </div>
    </section>
  );
}
