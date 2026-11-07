'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { apiGet, httpsCallable } from '@/lib/backend';
import { useRouter } from '@/i18n/routing';
import { Link } from '@/i18n/routing';
import type { PlatformEvent } from '@/lib/types';
import EventWizardStepper from '@/components/admin/events/wizard/EventWizardStepper';
import MainDataStage from '@/components/admin/events/wizard/MainDataStage';
import TimePlaceStage from '@/components/admin/events/wizard/TimePlaceStage';
import SecurityScreeningStage from '@/components/admin/events/wizard/SecurityScreeningStage';
import InterviewerStage from '@/components/admin/events/wizard/InterviewerStage';
import type { InterviewerFields, MainDataFields, SecurityFields, StageId, TimePlaceFields } from '@/components/admin/events/wizard/wizardTypes';

const emptyMainData: MainDataFields = { title: '', titleEn: '', description: '', descriptionEn: '', type: 'Workshop', gains: '', gainsEn: '' };
const emptyTimePlace: TimePlaceFields = { days: [], location: '', locationEn: '', capacity: 50, isUnlimitedCapacity: false, hideExactCapacity: false, gender: 'both' };
const emptySecurity: SecurityFields = { securityFormAcknowledged: false };
const emptyInterviewer: InterviewerFields = { interviewer: '', interviewerEn: '' };

export default function CreateEventPage() {
  const router = useRouter();
  const locale = useLocale();
  const isAr = locale === 'ar';
  const searchParams = useSearchParams();
  const resumeId = searchParams.get('eventId');

  const [eventId, setEventId] = useState<string | null>(null);
  const [loadingDraft, setLoadingDraft] = useState(!!resumeId);
  const [loadError, setLoadError] = useState('');
  const [activeStage, setActiveStage] = useState<StageId>('main');
  const [completedStages, setCompletedStages] = useState<Set<StageId>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const [mainData, setMainData] = useState<MainDataFields>(emptyMainData);
  const [timePlace, setTimePlace] = useState<TimePlaceFields>(emptyTimePlace);
  const [security, setSecurity] = useState<SecurityFields>(emptySecurity);
  const [interviewerData, setInterviewerData] = useState<InterviewerFields>(emptyInterviewer);

  useEffect(() => {
    if (!resumeId) return;
    (async () => {
      try {
        const event = await apiGet<PlatformEvent>(`/api/admin/events/${resumeId}`);
        setEventId(resumeId);
        setMainData({
          title: event.title, titleEn: event.titleEn, description: event.description, descriptionEn: event.descriptionEn,
          type: event.type, gains: (event.gains || []).join('\n'), gainsEn: (event.gainsEn || []).join('\n'),
        });
        setTimePlace({
          days: event.days || [], location: event.location, locationEn: event.locationEn,
          capacity: event.capacity, isUnlimitedCapacity: !!event.isUnlimitedCapacity, hideExactCapacity: !!event.hideExactCapacity,
          gender: event.gender || 'both',
        });
        setSecurity({ securityFormAcknowledged: !!event.securityFormAcknowledged });
        setInterviewerData({ interviewer: event.interviewer || '', interviewerEn: event.interviewerEn || '' });
        const done = new Set<StageId>(['main']);
        if ((event.days || []).length) done.add('time');
        if (event.securityFormAcknowledged) done.add('security');
        if (event.interviewer || event.interviewerEn) done.add('interviewer');
        setCompletedStages(done);
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : (isAr ? 'تعذر تحميل مسودة الفعالية.' : 'Could not load the event draft.'));
      } finally {
        setLoadingDraft(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeId]);

  const saveStage = async (stage: StageId, fields: Record<string, unknown>) => {
    setSaving(true);
    setSaveError('');
    try {
      const payload = eventId ? { eventId, ...fields } : fields;
      const result = await httpsCallable<typeof payload, { eventId: string }>(null, 'saveEvent')(payload);
      if (!eventId) setEventId(result.data.eventId);
      setCompletedStages(prev => new Set(prev).add(stage));
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : (isAr ? 'حدث خطأ أثناء الحفظ.' : 'Something went wrong while saving.'));
      throw error;
    } finally {
      setSaving(false);
    }
  };

  if (loadingDraft) {
    return <div className="max-w-4xl mx-auto py-12 text-center text-[var(--color-text-muted)]">{isAr ? 'جارٍ التحميل...' : 'Loading...'}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="flex items-center mb-6">
        <Link href="/admin/events" className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] me-4">
          <ArrowRight className="h-6 w-6 rtl:-scale-x-100" />
        </Link>
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)] font-cairo">{isAr ? 'إضافة فعالية جديدة' : 'Create a new event'}</h1>
      </div>

      {loadError && <p role="alert" className="mb-4 rounded-xl p-4 text-sm" style={{ backgroundColor: 'var(--color-danger-soft)', color: 'var(--color-danger)' }}>{loadError}</p>}

      <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5 sm:p-8 space-y-6">
        <EventWizardStepper
          isAr={isAr}
          activeStage={activeStage}
          completedStages={completedStages}
          locked={!eventId}
          onSelect={stage => setActiveStage(stage)}
        />

        {saveError && <p role="alert" className="rounded-xl p-3 text-sm" style={{ backgroundColor: 'var(--color-danger-soft)', color: 'var(--color-danger)' }}>{saveError}</p>}

        {!eventId && (
          <p className="rounded-xl p-3 text-sm" style={{ backgroundColor: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}>
            {isAr ? 'احفظ البيانات الأساسية أولاً لإتاحة باقي المراحل.' : 'Save the main data first to unlock the other stages.'}
          </p>
        )}

        {activeStage === 'main' && (
          <MainDataStage isAr={isAr} value={mainData} onChange={setMainData} saving={saving}
            onSave={async fields => { await saveStage('main', fields); if (!completedStages.has('time')) setActiveStage('time'); }} />
        )}
        {activeStage === 'time' && eventId && (
          <TimePlaceStage isAr={isAr} value={timePlace} onChange={setTimePlace} saving={saving}
            onSave={async fields => { await saveStage('time', fields); setActiveStage('security'); }} />
        )}
        {activeStage === 'security' && eventId && (
          <SecurityScreeningStage isAr={isAr} value={security} onChange={setSecurity} saving={saving}
            onSave={async fields => { await saveStage('security', fields); setActiveStage('interviewer'); }} />
        )}
        {activeStage === 'interviewer' && eventId && (
          <InterviewerStage isAr={isAr} value={interviewerData} onChange={setInterviewerData} saving={saving}
            onSave={async fields => { await saveStage('interviewer', fields); }} />
        )}
        {['design', 'settings', 'review', 'publish'].includes(activeStage) && (
          <div className="rounded-xl border border-dashed border-[var(--color-border)] p-10 text-center text-sm text-[var(--color-text-muted)]">
            {isAr ? 'هذه المرحلة قيد التطوير وستتوفر في تحديث قادم.' : 'This stage is still being built and will land in an upcoming update.'}
          </div>
        )}

        {eventId && (
          <div className="flex justify-end border-t border-[var(--color-border)] pt-4">
            <button type="button" onClick={() => router.push('/admin/events')} className="text-sm font-bold text-[var(--color-accent)] hover:underline">
              {isAr ? 'إنهاء لاحقًا والعودة إلى القائمة' : 'Finish later — back to the list'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
