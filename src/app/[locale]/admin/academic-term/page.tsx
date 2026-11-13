'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { httpsCallable } from '@/lib/backend';
import { AdminError, AdminLoading } from '@/components/admin/AdminData';
import { useToast } from '@/context/ToastContext';
import { Save, CalendarRange, Plus, Trash2 } from 'lucide-react';

interface AcademicTerm { startDate: string | null; endDate: string | null }
interface VacationRange { start: string; end: string; label?: string }
interface VacationSettings { weeklyDays: number[]; ranges: VacationRange[] }

const emptyVacation: VacationSettings = { weeklyDays: [], ranges: [] };

export default function AdminAcademicTermPage() {
  const isAr = useLocale() === 'ar';
  const { showToast } = useToast();
  const [term, setTerm] = useState<AcademicTerm>({ startDate: null, endDate: null });
  const [vacation, setVacation] = useState<VacationSettings>(emptyVacation);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingVacation, setSavingVacation] = useState(false);

  const weekdayNames = isAr
    ? ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  useEffect(() => {
    let active = true;
    Promise.all([
      httpsCallable<unknown, AcademicTerm>(null, 'getAcademicTerm')({}),
      httpsCallable<unknown, VacationSettings>(null, 'getVacationDays')({}),
    ])
      .then(([termRes, vacationRes]) => {
        if (!active) return;
        setTerm(termRes.data);
        setVacation({ weeklyDays: vacationRes.data.weeklyDays || [], ranges: vacationRes.data.ranges || [] });
      })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await httpsCallable(null, 'saveAcademicTerm')(term);
      showToast(isAr ? 'تم حفظ التواريخ بنجاح.' : 'Dates saved successfully.', 'success');
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : 'Unable to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleWeeklyDay = (day: number) => {
    setVacation(v => ({
      ...v,
      weeklyDays: v.weeklyDays.includes(day) ? v.weeklyDays.filter(d => d !== day) : [...v.weeklyDays, day].sort(),
    }));
  };

  const handleSaveVacation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingVacation(true);
    try {
      await httpsCallable(null, 'saveVacationDays')(vacation);
      showToast(isAr ? 'تم حفظ أيام العطلة بنجاح.' : 'Vacation days saved successfully.', 'success');
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : 'Unable to save', 'error');
    } finally {
      setSavingVacation(false);
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

      <header className="pt-4">
        <h2 className="text-lg font-black font-cairo text-[var(--color-text-primary)]">
          {isAr ? 'أيام العطلة' : 'Vacation days'}
        </h2>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          {isAr
            ? 'تُعرض أيام العطلة بلون مختلف في تقويم الرئيسية: عطلة أسبوعية متكررة وفترات محددة (كعطلة نصف السنة).'
            : 'Vacation days are highlighted on the home page calendar: a recurring weekly day off, plus specific date ranges (e.g. a semester break).'}
        </p>
      </header>

      <form onSubmit={handleSaveVacation} className="rounded-3xl border border-[var(--color-border)]/50 bg-[var(--color-surface)]/80 backdrop-blur-md p-6 shadow-xs space-y-5 max-w-lg">
        <div>
          <label className="block text-sm font-bold text-[var(--color-text-secondary)] mb-2">
            {isAr ? 'عطلة أسبوعية متكررة' : 'Recurring weekly days off'}
          </label>
          <div className="flex flex-wrap gap-2">
            {weekdayNames.map((name, day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleWeeklyDay(day)}
                className={`cursor-pointer px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors ${
                  vacation.weeklyDays.includes(day)
                    ? 'bg-rose-100 border-rose-300 text-rose-700'
                    : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)]'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-[var(--color-text-secondary)] mb-2">
            {isAr ? 'فترات عطلة محددة' : 'Specific vacation ranges'}
          </label>
          <div className="space-y-2">
            {vacation.ranges.map((range, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--color-border)] p-2.5">
                <input
                  type="date" value={range.start}
                  onChange={e => setVacation(v => ({ ...v, ranges: v.ranges.map((r, ri) => ri === i ? { ...r, start: e.target.value } : r) }))}
                  className="px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] text-xs text-[var(--color-text-primary)]"
                />
                <span className="text-xs text-[var(--color-text-muted)]">{isAr ? 'إلى' : 'to'}</span>
                <input
                  type="date" value={range.end}
                  onChange={e => setVacation(v => ({ ...v, ranges: v.ranges.map((r, ri) => ri === i ? { ...r, end: e.target.value } : r) }))}
                  className="px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] text-xs text-[var(--color-text-primary)]"
                />
                <input
                  type="text" value={range.label || ''} placeholder={isAr ? 'تسمية (اختياري)' : 'Label (optional)'}
                  onChange={e => setVacation(v => ({ ...v, ranges: v.ranges.map((r, ri) => ri === i ? { ...r, label: e.target.value } : r) }))}
                  className="flex-1 min-w-[8rem] px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] text-xs text-[var(--color-text-primary)]"
                />
                <button
                  type="button" aria-label={isAr ? 'حذف' : 'Remove'}
                  onClick={() => setVacation(v => ({ ...v, ranges: v.ranges.filter((_, ri) => ri !== i) }))}
                  className="cursor-pointer p-1.5 rounded-lg hover:bg-rose-50 text-rose-500"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setVacation(v => ({ ...v, ranges: [...v.ranges, { start: '', end: '', label: '' }] }))}
            className="cursor-pointer mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-[var(--color-accent)] hover:opacity-80"
          >
            <Plus size={14} />
            {isAr ? 'إضافة فترة' : 'Add range'}
          </button>
        </div>

        <button
          type="submit"
          disabled={savingVacation}
          className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent)] hover:opacity-90 text-[var(--color-accent-contrast)] px-5 py-2.5 text-sm font-bold transition-all disabled:opacity-50"
        >
          <Save size={16} />
          {savingVacation ? (isAr ? 'جارٍ الحفظ…' : 'Saving…') : (isAr ? 'حفظ' : 'Save')}
        </button>
      </form>
    </div>
  );
}
