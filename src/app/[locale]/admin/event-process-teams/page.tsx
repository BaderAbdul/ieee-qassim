'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { httpsCallable } from '@/lib/backend';
import { apiGetArray } from '@/lib/backendResponse';
import { AdminError, AdminLoading } from '@/components/admin/AdminData';
import { useToast } from '@/context/ToastContext';
import { STAGES, type StageId } from '@/components/admin/events/wizard/wizardTypes';
import { Save, Users2 } from 'lucide-react';

interface Team { id: string; nameAr: string; nameEn: string }
type Assignment = Partial<Record<StageId, string | null>>;

export default function AdminEventProcessTeamsPage() {
  const isAr = useLocale() === 'ar';
  const { showToast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [assignment, setAssignment] = useState<Assignment>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [teamRows, current] = await Promise.all([
          apiGetArray<Team>('/api/admin/teams'),
          httpsCallable<unknown, Assignment>(null, 'getEventProcessTeams')({}).then(result => result.data),
        ]);
        if (!active) return;
        setTeams(teamRows);
        setAssignment(current);
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : (isAr ? 'تعذر تحميل البيانات.' : 'Unable to load.'));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [isAr]);

  const save = async () => {
    setSaving(true);
    try {
      await httpsCallable(null, 'saveEventProcessTeams')(assignment);
      showToast(isAr ? 'تم الحفظ بنجاح.' : 'Saved successfully.', 'success');
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : (isAr ? 'تعذر الحفظ.' : 'Unable to save.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <AdminLoading />;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-black font-cairo text-[var(--color-text-primary)] flex items-center gap-2">
          <Users2 size={20} className="text-[var(--color-accent)]" />
          {isAr ? 'الفريق المسؤول عن كل مرحلة' : 'Team ownership per stage'}
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          {isAr
            ? 'حدد الفريق المسؤول عن كل مرحلة من مراحل إنشاء الفعالية. يُستخدم هذا لتمييز سجل النشاط داخل كل فعالية بالفريق الذي قام بالتحديث.'
            : 'Assign which team owns each stage of the event-creation wizard. Used to label each event’s activity trail with the team behind each update.'}
        </p>
      </header>

      {error && <AdminError message={error} />}

      <div className="rounded-3xl border border-[var(--color-border)]/50 bg-[var(--color-surface)]/80 backdrop-blur-md p-6 space-y-4 max-w-lg">
        {STAGES.map(stage => (
          <div key={stage.id} className="flex items-center justify-between gap-3">
            <span className="text-sm font-bold text-[var(--color-text-secondary)]">{isAr ? stage.labelAr : stage.labelEn}</span>
            <select
              value={assignment[stage.id] ?? ''}
              onChange={e => setAssignment(prev => ({ ...prev, [stage.id]: e.target.value || null }))}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm"
            >
              <option value="">{isAr ? 'بلا تعيين' : 'Unassigned'}</option>
              {teams.map(team => <option key={team.id} value={team.id}>{isAr ? team.nameAr : team.nameEn}</option>)}
            </select>
          </div>
        ))}
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent)] hover:opacity-90 text-[var(--color-accent-contrast)] px-5 py-2.5 text-sm font-bold transition-all disabled:opacity-50"
        >
          <Save size={16} />
          {saving ? (isAr ? 'جارٍ الحفظ…' : 'Saving…') : (isAr ? 'حفظ' : 'Save')}
        </button>
      </div>
    </div>
  );
}
