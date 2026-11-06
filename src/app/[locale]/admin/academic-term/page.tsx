'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { httpsCallable } from '@/lib/backend';
import { AdminError, AdminLoading } from '@/components/admin/AdminData';
import { Save, CalendarRange } from 'lucide-react';

interface AcademicTerm { startDate: string | null; endDate: string | null }

export default function AdminAcademicTermPage() {
  const isAr = useLocale() === 'ar';
  const [term, setTerm] = useState<AcademicTerm>({ startDate: null, endDate: null });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    httpsCallable<unknown, AcademicTerm>(null, 'getAcademicTerm')({})
      .then(({ data }) => { if (active) setTerm(data); })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setSaved(false); setError(null);
    try {
      await httpsCallable(null, 'saveAcademicTerm')(term);
      setSaved(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <AdminLoading />;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-black font-cairo text-[var(--color-text-primary)] flex items-center gap-2">
          <CalendarRange size={20} className="text-[var(--color-accent)]" />
          {isAr ? 'الفصل الدراسي' : 'Academic term'}
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          {isAr
            ? 'حدد بداية ونهاية الفصل الدراسي ليعرض تقويم الرئيسية رقم الأسبوع الجامعي مقابل كل أسبوع.'
            : 'Set the term’s start and end date so the home page calendar can number weeks against the university schedule.'}
        </p>
      </header>

      {error && <AdminError message={error} />}
      {saved && (
        <p role="status" className="rounded-xl border border-[var(--color-success)]/30 bg-[var(--color-success-soft)] p-4 text-sm font-bold text-[var(--color-success)]">
          {isAr ? 'تم حفظ التواريخ بنجاح.' : 'Dates saved successfully.'}
        </p>
      )}

      <form onSubmit={handleSave} className="rounded-3xl border border-[var(--color-border)]/50 bg-[var(--color-surface)]/80 backdrop-blur-md p-6 shadow-xs space-y-5 max-w-lg">
        <div>
          <label className="block text-sm font-bold text-[var(--color-text-secondary)] mb-2" htmlFor="term-start">
            {isAr ? 'بداية الفصل الدراسي' : 'Term start date'}
          </label>
          <input
            id="term-start"
            type="date"
            value={term.startDate ?? ''}
            onChange={e => setTerm(t => ({ ...t, startDate: e.target.value || null }))}
            className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-[var(--color-text-secondary)] mb-2" htmlFor="term-end">
            {isAr ? 'نهاية الفصل الدراسي' : 'Term end date'}
          </label>
          <input
            id="term-end"
            type="date"
            value={term.endDate ?? ''}
            onChange={e => setTerm(t => ({ ...t, endDate: e.target.value || null }))}
            className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent)] hover:opacity-90 text-[var(--color-accent-contrast)] px-5 py-2.5 text-sm font-bold transition-all disabled:opacity-50"
        >
          <Save size={16} />
          {saving ? (isAr ? 'جارٍ الحفظ…' : 'Saving…') : (isAr ? 'حفظ' : 'Save')}
        </button>
      </form>
    </div>
  );
}
