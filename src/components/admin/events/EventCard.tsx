'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/routing';
import {
  ArrowUpRight, Calendar, Clock, Award, QrCode, Link2, MapPin, Eye, EyeOff,
} from 'lucide-react';
import { toJsDate } from '@/lib/dateUtils';
import type { PlatformEvent, EventState } from '@/lib/types';
import { formatAdminDate } from '@/components/admin/AdminData';
import { eventStateLabel } from '@/components/admin/EventWorkspace';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import EventLinkQrModal from '@/components/admin/events/EventLinkQrModal';

export const transitions: Record<EventState, EventState[]> = {
  Draft: ['Published', 'Registration Open', 'Ongoing', 'Archived'],
  Published: ['Draft', 'Registration Open', 'Ongoing', 'Archived'],
  'Registration Open': ['Published', 'Registration Closed', 'Ongoing', 'Archived'],
  'Registration Closed': ['Registration Open', 'Ongoing', 'Completed', 'Archived'],
  Ongoing: ['Registration Open', 'Completed', 'Archived'],
  Completed: ['Ongoing', 'Archived'],
  Archived: ['Draft', 'Published', 'Registration Open', 'Ongoing', 'Completed'],
};

export const stateBadgeColors: Record<EventState, { bg: string; text: string; border: string }> = {
  Draft: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
  Published: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  'Registration Open': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  'Registration Closed': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  Ongoing: { bg: 'bg-[var(--color-accent-soft)]', text: 'text-[var(--color-accent)]', border: 'border-transparent' },
  Completed: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  Archived: { bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-200' },
};

interface EventCardProps {
  event: PlatformEvent;
  isAr: boolean;
  locale: string;
  busy: boolean;
  onChangeState: (state: EventState) => void;
  onToggleVisibility: (nextUnlisted: boolean) => void;
}

export default function EventCard({
  event, isAr, locale, busy, onChangeState, onToggleVisibility,
}: EventCardProps) {
  const [pendingState, setPendingState] = useState<EventState | null>(null);
  const [pendingUnlisted, setPendingUnlisted] = useState<boolean | null>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);

  const date = toJsDate(event.date);
  const badge = stateBadgeColors[event.state] || stateBadgeColors.Draft;
  const isVisible = !event.isUnlisted;

  return (
    <article className="group relative rounded-3xl border bg-[var(--color-surface)]/60 backdrop-blur-md p-5 sm:p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between border-[var(--color-border)]/50">
      {/* Stretched link: makes the whole card act as a button to the event's details, without
          fighting the several real buttons/links still inside it -- those get `relative z-10`
          below so they paint above this and stay independently clickable. */}
      <Link
        href={`/admin/events/${event.id}`}
        className="absolute inset-0 rounded-3xl z-0"
        aria-label={isAr ? event.title : (event.titleEn || event.title)}
      />
      <div className="pointer-events-none">
        {/* Status + visibility badge, kept at the card's top-left corner. The select is the
            actual status-change control; the eye icon just reflects whether the event is public. */}
        <div className={`pointer-events-auto flex w-fit mr-auto items-center gap-1 rounded-full border shadow-sm mb-3 ${badge.bg} ${badge.text} ${badge.border} ps-2 pe-1 py-1`}>
          {isVisible ? (
            <Eye className="w-3 h-3 shrink-0" aria-label={isAr ? 'ظاهرة في الموقع' : 'Visible on site'} />
          ) : (
            <EyeOff className="w-3 h-3 shrink-0" aria-label={isAr ? 'مخفية عن الموقع' : 'Hidden from site'} />
          )}
          {transitions[event.state]?.length ? (
            <select
              aria-label={isAr ? `تغيير حالة ${event.title}` : `Change ${event.title} state`}
              value={event.state}
              disabled={busy}
              onChange={(e) => setPendingState(e.target.value as EventState)}
              className="bg-transparent border-none px-0.5 py-0 text-[11px] font-bold disabled:opacity-50 transition-all focus:outline-none"
            >
              <option value={event.state}>{eventStateLabel(event.state, isAr)}</option>
              {transitions[event.state].map((st) => (
                <option key={st} value={st}>{eventStateLabel(st, isAr)}</option>
              ))}
            </select>
          ) : (
            <span className="text-[11px] font-bold px-0.5">{isAr ? 'مؤرشفة' : 'Archived'}</span>
          )}
        </div>

        <div className="flex items-start gap-3 mb-3">
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden bg-[var(--color-surface-2)] flex items-center justify-center text-[var(--color-text-muted)] flex-shrink-0">
            {event.coverUrl ? (
              <Image src={event.coverUrl} alt="" fill sizes="64px" className="object-cover" />
            ) : (
              <Calendar className="w-6 h-6" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] border border-[var(--color-border)]">
                {event.type}
              </span>
              {event.hasCertificate && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center gap-1">
                  <Award className="w-3 h-3" />
                  <span>{isAr ? 'شهادة' : 'Certificate'}</span>
                </span>
              )}
            </div>

            <div className="mt-2">
              <h2 className="text-base font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors font-cairo truncate">
                {!isAr && event.titleEn ? event.titleEn : event.title}
              </h2>
              <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--color-text-secondary)] mt-1">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatAdminDate(date?.toISOString(), locale)}</span>
                </span>
                {event.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="truncate max-w-[160px]">{event.location}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[var(--color-surface-2)]/70 backdrop-blur-sm rounded-2xl p-3 border border-[var(--color-border)]/50 space-y-1.5 mb-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--color-text-secondary)] font-medium">
              {isAr ? 'المسجلون:' : 'Registered:'} <strong className="text-[var(--color-text-primary)]">{event.registeredCount || 0}</strong> / {event.isUnlimitedCapacity ? '∞' : event.capacity}
            </span>
            <span className="text-[var(--color-accent)] font-bold">
              {isAr ? 'الحضور الفعلي:' : 'Attended:'} {event.attendanceCount || 0}
            </span>
          </div>
          {!event.isUnlimitedCapacity && event.capacity ? (
            <div className="w-full bg-[var(--color-border)] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[var(--color-accent)] h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.round(((event.registeredCount || 0) / event.capacity) * 100))}%` }}
              />
            </div>
          ) : null}
        </div>
      </div>

      <div className="pointer-events-none border-t border-[var(--color-border)] pt-3 flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/admin/events/${event.id}`}
            className="pointer-events-auto bg-[var(--color-accent-soft)] hover:opacity-80 text-[var(--color-accent)] text-xs font-bold px-3 py-2 rounded-xl transition-opacity flex items-center gap-1"
          >
            <span>{isAr ? 'التفاصيل' : 'Details'}</span>
            <ArrowUpRight size={14} />
          </Link>
          <Link
            href={`/admin/events/${event.id}/checkin-desk`}
            className="pointer-events-auto bg-[var(--color-surface-2)] hover:opacity-80 text-[var(--color-text-secondary)] p-2 rounded-xl transition-opacity"
            title={isAr ? 'مكتب التحضير المباشر' : 'Check-in desk'}
          >
            <QrCode size={15} />
          </Link>
          <button
            type="button"
            onClick={() => setShowLinkModal(true)}
            className="pointer-events-auto bg-[var(--color-surface-2)] hover:opacity-80 text-[var(--color-text-secondary)] text-xs font-bold px-3 py-2 rounded-xl transition-opacity flex items-center gap-1"
            title={isAr ? 'نسخ رابط الفعالية' : 'Copy event link'}
          >
            <Link2 size={14} />
            <span className="hidden sm:inline">{isAr ? 'نسخ الرابط' : 'Copy link'}</span>
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setPendingUnlisted(isVisible)}
            className="pointer-events-auto text-xs font-bold px-3 py-2 rounded-xl bg-[var(--color-surface-2)] hover:opacity-80 text-[var(--color-text-secondary)] disabled:opacity-50 transition-opacity ms-auto"
          >
            {isVisible ? (isAr ? 'إخفاء' : 'Hide') : (isAr ? 'إظهار' : 'Show')}
          </button>
        </div>
      </div>

      {showLinkModal && (
        <EventLinkQrModal
          url={`${typeof window !== 'undefined' ? window.location.origin : ''}/${locale}/events/${event.id}`}
          isAr={isAr}
          onClose={() => setShowLinkModal(false)}
        />
      )}

      <ConfirmDialog
        open={pendingState !== null}
        icon={<Clock className="w-6 h-6" />}
        tone="accent"
        title={isAr ? 'تغيير حالة الفعالية؟' : 'Change the event state?'}
        message={isAr
          ? `تغيير «${event.title}» إلى «${pendingState ? eventStateLabel(pendingState, true) : ''}».`
          : `Change "${event.title}" to "${pendingState}".`}
        confirmLabel={isAr ? 'تأكيد' : 'Confirm'}
        cancelLabel={isAr ? 'إلغاء' : 'Cancel'}
        busy={busy}
        onConfirm={() => { if (pendingState) onChangeState(pendingState); setPendingState(null); }}
        onCancel={() => setPendingState(null)}
      />

      <ConfirmDialog
        open={pendingUnlisted !== null}
        icon={pendingUnlisted ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
        tone={pendingUnlisted ? 'warning' : 'accent'}
        title={pendingUnlisted ? (isAr ? 'إخفاء الفعالية؟' : 'Hide the event?') : (isAr ? 'إظهار الفعالية؟' : 'Show the event?')}
        message={pendingUnlisted
          ? (isAr ? `ستختفي «${event.title}» من الموقع الرئيسي فورًا.` : `"${event.title}" will disappear from the public site right away.`)
          : (isAr ? `ستظهر «${event.title}» على الموقع الرئيسي للجميع.` : `"${event.title}" will become visible to everyone on the public site.`)}
        confirmLabel={isAr ? 'تأكيد' : 'Confirm'}
        cancelLabel={isAr ? 'إلغاء' : 'Cancel'}
        busy={busy}
        onConfirm={() => { if (pendingUnlisted !== null) onToggleVisibility(pendingUnlisted); setPendingUnlisted(null); }}
        onCancel={() => setPendingUnlisted(null)}
      />
    </article>
  );
}
