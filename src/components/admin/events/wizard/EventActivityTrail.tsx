'use client';

import { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import { apiGetArray } from '@/lib/backendResponse';
import { LEGACY_STAGE, STAGES, type StageId } from './wizardTypes';

interface ActivityEntry {
  id: number;
  action: string;
  stage: string | null;
  teamId: string | null;
  teamNameAr: string | null;
  teamNameEn: string | null;
  actorName: string;
  createdAt: string;
}

interface EventActivityTrailProps {
  isAr: boolean;
  eventId: number;
  stage: StageId;
  /** Bump after a successful save to refetch this stage's trail. */
  refreshKey: number;
}

export default function EventActivityTrail({ isAr, eventId, stage, refreshKey }: EventActivityTrailProps) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    apiGetArray<ActivityEntry>(`/api/admin/events/${eventId}/activity`)
      .then(rows => { if (active) setEntries(rows); })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : (isAr ? 'تعذر تحميل سجل النشاط.' : 'Could not load the activity trail.')); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, refreshKey]);

  const stageEntries = entries.filter(entry => ((entry.stage && LEGACY_STAGE[entry.stage]) || entry.stage) === stage);
  if (error) return <p className="text-xs text-[var(--color-text-muted)]">{error}</p>;
  if (!stageEntries.length) return null;

  const stageMeta = STAGES.find(s => s.id === stage);

  return (
    <div className="space-y-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)]/60 p-4">
      <p className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-text-muted)]">
        <History size={13} />
        {isAr ? `سجل النشاط — ${stageMeta?.labelAr ?? ''}` : `Activity — ${stageMeta?.labelEn ?? ''}`}
      </p>
      <ul className="space-y-1.5">
        {stageEntries.map(entry => (
          <li key={entry.id} className="text-xs text-[var(--color-text-secondary)]">
            <span className="font-bold">{entry.actorName}</span>
            {(entry.teamNameAr || entry.teamNameEn) && (
              <>
                {' '}{isAr ? 'من' : 'from'}{' '}
                <span className="font-bold">{isAr ? entry.teamNameAr : entry.teamNameEn}</span>
              </>
            )}
            {' '}{isAr ? 'حدّث هذه المرحلة' : 'updated this stage'}
            <span className="text-[var(--color-text-muted)]"> — {new Date(entry.createdAt).toLocaleString(isAr ? 'ar' : 'en', { dateStyle: 'medium', timeStyle: 'short' })}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
