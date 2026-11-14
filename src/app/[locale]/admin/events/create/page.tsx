'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, Trash2 } from 'lucide-react';
import { apiGet, httpsCallable } from '@/lib/backend';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from '@/i18n/routing';
import { Link } from '@/i18n/routing';
import type { EventReport, PlatformEvent } from '@/lib/types';
import { normalizeFeedbackQuestions } from '@/lib/feedbackQuestionValidation';
import EventWizardStepper from '@/components/admin/events/wizard/EventWizardStepper';
import MainDataStage from '@/components/admin/events/wizard/MainDataStage';
import TimePlaceStage from '@/components/admin/events/wizard/TimePlaceStage';
import SecurityScreeningStage from '@/components/admin/events/wizard/SecurityScreeningStage';
import InterviewerStage from '@/components/admin/events/wizard/InterviewerStage';
import SponsorsStage from '@/components/admin/events/wizard/SponsorsStage';
import ReportStage from '@/components/admin/events/wizard/ReportStage';
import DesignStage from '@/components/admin/events/wizard/DesignStage';
import SettingsStage from '@/components/admin/events/wizard/SettingsStage';
import ReviewStage from '@/components/admin/events/wizard/ReviewStage';
import ShareStage from '@/components/admin/events/wizard/ShareStage';
import EventActivityTrail from '@/components/admin/events/wizard/EventActivityTrail';
import MergedStage from '@/components/admin/events/wizard/MergedStage';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import { useToast } from '@/context/ToastContext';
import { LEGACY_STAGE, STAGES, type Collect, type DesignFields, type InterviewerFields, type MainDataFields, type ReviewFields, type SecurityFields, type SettingsFields, type ShareFields, type SponsorsFields, type StageId, type TimePlaceFields } from '@/components/admin/events/wizard/wizardTypes';

const emptyMainData: MainDataFields = { title: '', titleEn: '', description: '', descriptionEn: '', type: 'Workshop', gains: '', gainsEn: '' };
const emptyTimePlace: TimePlaceFields = { days: [], locationType: 'in_person', location: '', locationEn: '', capacity: 50, isUnlimitedCapacity: false, hideExactCapacity: false, gender: 'both' };
const emptySecurity: SecurityFields = { securityFormAcknowledged: false };
const emptyInterviewer: InterviewerFields = { organizers: [], interviewer: '', interviewerEn: '', interviewerEmail: '', speakers: [] };
const emptyDesign: DesignFields = { coverUrl: '' };
const emptySettings: SettingsFields = { requiresRegistration: true, registrationMode: 'Auto', vtoolsUuid: '', hasCertificate: false, certificateTemplateId: '', emailTemplateId: '' };
const emptyReview: ReviewFields = { feedbackQuestions: [] };
const emptyShare: ShareFields = { socialLinks: [] };

/** "This event requires registration": moved here from the settings stage, next to the seat count it affects. */
function RegistrationToggle({ isAr, value, onChange, registerCollect }: {
  isAr: boolean; value: boolean; onChange: (next: boolean) => void; registerCollect: (collect: Collect) => void;
}) {
  useEffect(() => { registerCollect(() => ({ requiresRegistration: value })); });
  return (
    <label className="flex items-start gap-2 text-sm font-bold text-[var(--color-text-secondary)]">
      <input type="checkbox" className="mt-0.5" checked={value} onChange={e => onChange(e.target.checked)} />
      <span>
        {isAr ? 'تتطلب الفعالية تسجيلًا مسبقًا' : 'This event requires registration'}
        <small className="block text-xs font-normal text-[var(--color-text-muted)]">
          {isAr ? 'عند الإيقاف يحضر الجميع بمسح رمز التحضير دون تسجيل مسبق.' : 'When off, everyone attends by scanning the check-in code, without registering first.'}
        </small>
      </span>
    </label>
  );
}

export default function CreateEventPage() {
  const router = useRouter();
  const locale = useLocale();
  const isAr = locale === 'ar';
  const { userData } = useAuth();
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const resumeParam = searchParams.get('eventId');
  const resumeId = resumeParam && /^\d+$/.test(resumeParam) ? Number(resumeParam) : null;
  const rawStageParam = searchParams.get('stage');
  // Old links still say time / security / share / review / report: those stages are now sections of the merged ones.
  const normalizedStageParam = rawStageParam && LEGACY_STAGE[rawStageParam] ? LEGACY_STAGE[rawStageParam] : rawStageParam;
  const stageParam = STAGES.some(stage => stage.id === normalizedStageParam) ? (normalizedStageParam as StageId) : null;
  const highlightField = searchParams.get('field') || undefined;

  const [eventId, setEventId] = useState<number | null>(null);
  const [loadingDraft, setLoadingDraft] = useState(!!resumeId);
  const [loadError, setLoadError] = useState(() =>
    (resumeParam && !resumeId) ? (isAr ? 'رابط استكمال المسودة غير صالح.' : 'Invalid draft resume link.') : '');
  const [activeStage, setActiveStage] = useState<StageId>(stageParam || 'main');
  const [completedStages, setCompletedStages] = useState<Set<StageId>>(new Set());
  const [saving, setSaving] = useState(false);
  const [activityRefreshKey, setActivityRefreshKey] = useState(0);

  const [mainData, setMainData] = useState<MainDataFields>(emptyMainData);
  const [timePlace, setTimePlace] = useState<TimePlaceFields>(emptyTimePlace);
  const [security, setSecurity] = useState<SecurityFields>(emptySecurity);
  const [interviewerData, setInterviewerData] = useState<InterviewerFields>(emptyInterviewer);
  const [sponsorsData, setSponsorsData] = useState<SponsorsFields>({ hasSponsors: null, sponsors: [] });
  const [report, setReport] = useState<EventReport | null>(null);
  const [design, setDesign] = useState<DesignFields>(emptyDesign);
  const [settingsData, setSettingsData] = useState<SettingsFields>(emptySettings);
  const [reviewData, setReviewData] = useState<ReviewFields>(emptyReview);
  const [attendance, setAttendance] = useState('');
  const [shareData, setShareData] = useState<ShareFields>(emptyShare);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

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
          days: event.days || [], locationType: event.locationType || 'in_person', location: event.location, locationEn: event.locationEn,
          capacity: event.capacity, isUnlimitedCapacity: !!event.isUnlimitedCapacity, hideExactCapacity: !!event.hideExactCapacity,
          gender: event.gender || 'both',
        });
        setSecurity({ securityFormAcknowledged: !!event.securityFormAcknowledged });
        setInterviewerData({
          organizers: event.organizers || [],
          interviewer: event.interviewer || '', interviewerEn: event.interviewerEn || '',
          interviewerEmail: event.interviewerEmail || '',
          speakers: Array.from({ length: Math.max((event.speakers || []).length, (event.speakersEn || []).length, (event.speakerEmails || []).length) }, (_, index) => ({
            name: event.speakers?.[index] || '', nameEn: event.speakersEn?.[index] || '', email: event.speakerEmails?.[index] || '',
          })),
        });
        setSponsorsData({ hasSponsors: event.hasSponsors ?? null, sponsors: event.sponsors || [] });
        setReport(event.report || null);
        setDesign({ coverUrl: event.coverUrl || '' });
        setSettingsData({
          requiresRegistration: event.requiresRegistration !== false, registrationMode: event.registrationMode || 'Auto',
          vtoolsUuid: event.vtoolsUuid || '', hasCertificate: !!event.hasCertificate,
          certificateTemplateId: event.certificateTemplateId || '', emailTemplateId: event.emailTemplateId || '',
        });
        setReviewData({ feedbackQuestions: normalizeFeedbackQuestions(event.feedbackQuestions || []) });
        setAttendance(event.manualAttendanceCount === null || event.manualAttendanceCount === undefined ? '' : String(event.manualAttendanceCount));
        setShareData({ socialLinks: event.socialLinks || [] });
        const done = new Set<StageId>();
        if ((event.days || []).length) done.add('main');
        if (event.securityFormAcknowledged || event.interviewer || event.interviewerEn || (event.speakers || []).length || (event.speakersEn || []).length) done.add('interviewer');
        if (typeof event.hasSponsors === 'boolean') done.add('sponsors');
        if (event.coverUrl || (event.socialLinks || []).length) done.add('design');
        if (event.vtoolsUuid || event.hasCertificate || event.registrationMode === 'Manual' || event.requiresRegistration === false
            || (event.feedbackQuestions || []).length || event.report) done.add('settings');
        setCompletedStages(done);
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : (isAr ? 'تعذر تحميل مسودة الفعالية.' : 'Could not load the event draft.'));
      } finally {
        setLoadingDraft(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeParam]);

  const saveStage = async (stage: StageId, fields: Record<string, unknown>) => {
    setSaving(true);
    try {
      const payload = eventId ? { eventId, ...fields } : fields;
      const result = await httpsCallable<typeof payload, { eventId: number }>(null, 'saveEvent')(payload);
      if (!eventId) setEventId(result.data.eventId);
      setCompletedStages(prev => new Set(prev).add(stage));
      setActivityRefreshKey(k => k + 1);
      showToast(isAr ? 'تم الحفظ.' : 'Saved.', 'success');
      return true;
    } catch (error) {
      showToast(error instanceof Error ? error.message : (isAr ? 'حدث خطأ أثناء الحفظ.' : 'Something went wrong while saving.'), 'error');
      // The page owns this request/error boundary. Click handlers must not receive an
      // unhandled rejection, and the wizard must remain on the stage that failed.
      return false;
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
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)] font-cairo">
          {resumeId ? (isAr ? 'تعديل الفعالية' : 'Edit event') : (isAr ? 'إضافة فعالية جديدة' : 'Create a new event')}
        </h1>
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

        {!eventId && (
          <p className="rounded-xl p-3 text-sm" style={{ backgroundColor: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}>
            {isAr ? 'احفظ البيانات الأساسية أولاً لإتاحة باقي المراحل.' : 'Save the main data first to unlock the other stages.'}
          </p>
        )}

        {activeStage === 'main' && (
          <MergedStage isAr={isAr} saving={saving}
            parts={[
              { id: 'main', title: isAr ? 'البيانات الأساسية' : 'Main data', render: register => (
                <MainDataStage isAr={isAr} value={mainData} onChange={setMainData} saving={saving} highlightField={highlightField} hideSave registerCollect={register}
                  onSave={async () => {}} />) },
              { id: 'time', title: isAr ? 'الزمان والمكان' : 'Time & place', render: register => (
                <TimePlaceStage isAr={isAr} value={timePlace} onChange={setTimePlace} saving={saving} highlightField={highlightField} hideSave registerCollect={register}
                  onSave={async () => {}} />) },
              { id: 'registration', title: isAr ? 'التسجيل' : 'Registration', render: register => (
                <RegistrationToggle isAr={isAr} value={settingsData.requiresRegistration} onChange={requiresRegistration => setSettingsData({ ...settingsData, requiresRegistration })} registerCollect={register} />) },
            ]}
            onSave={async fields => { if (await saveStage('main', fields) && !completedStages.has('interviewer')) setActiveStage('interviewer'); }} />
        )}
        {activeStage === 'interviewer' && eventId && (
          <MergedStage isAr={isAr} saving={saving}
            parts={[
              { id: 'interviewer', title: isAr ? 'المحاور والمتحدثون والمنظمون' : 'Interviewer, speakers & organizers', render: register => (
                <InterviewerStage isAr={isAr} eventId={eventId} value={interviewerData} onChange={setInterviewerData} saving={saving} hideSave registerCollect={register}
                  onSave={async () => {}} />) },
              { id: 'security', title: isAr ? 'التصريح الأمني' : 'Security screening', render: register => (
                <SecurityScreeningStage isAr={isAr} value={security} onChange={setSecurity} saving={saving} hideSave registerCollect={register}
                  onSave={async () => {}} />) },
            ]}
            onSave={async fields => { if (await saveStage('interviewer', fields)) setActiveStage('sponsors'); }} />
        )}
        {activeStage === 'sponsors' && eventId && (
          <SponsorsStage isAr={isAr} value={sponsorsData} onChange={setSponsorsData} saving={saving}
            onSave={async fields => { if (await saveStage('sponsors', fields)) setActiveStage('design'); }} />
        )}
        {activeStage === 'design' && eventId && (
          <MergedStage isAr={isAr} saving={saving}
            parts={[
              { id: 'design', title: isAr ? 'التصميم' : 'Design', render: register => (
                <DesignStage isAr={isAr} eventId={eventId} value={design} onChange={setDesign} saving={saving} hideSave registerCollect={register}
                  onSave={async () => {}} />) },
              { id: 'share', title: isAr ? 'النشر' : 'Publication', render: register => (
                <ShareStage isAr={isAr} value={shareData} onChange={setShareData} saving={saving} hideSave registerCollect={register}
                  onSave={async () => {}} />) },
            ]}
            onSave={async fields => { if (await saveStage('design', fields)) setActiveStage('settings'); }} />
        )}
        {activeStage === 'settings' && eventId && (
          <MergedStage isAr={isAr} saving={saving} saveLabel={isAr ? 'حفظ' : 'Save'}
            parts={[
              { id: 'settings', title: isAr ? 'الإعدادات' : 'Settings', render: register => (
                <SettingsStage isAr={isAr} value={settingsData} onChange={setSettingsData} saving={saving} eventId={eventId} highlightField={highlightField} hideSave registerCollect={register}
                  onSave={async () => {}} />) },
              { id: 'review', title: isAr ? 'نموذج التقييم' : 'Feedback form', render: register => (
                <ReviewStage isAr={isAr} value={reviewData} onChange={setReviewData} saving={saving} hideSave registerCollect={register}
                  onSave={async () => {}} />) },
              { id: 'report', title: isAr ? 'تقرير الفعالية' : 'Event report', render: register => (
                <ReportStage isAr={isAr} eventId={eventId} report={report} attendance={attendance} onAttendanceChange={setAttendance} registerCollect={register}
                  onSaved={saved => { setReport(saved); setCompletedStages(previous => new Set(previous).add('settings')); setActivityRefreshKey(k => k + 1); }} />) },
            ]}
            onSave={async fields => { await saveStage('settings', fields); }} />
        )}

        {eventId && <EventActivityTrail isAr={isAr} eventId={eventId} stage={activeStage} refreshKey={activityRefreshKey} />}

        {eventId && (
          <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-4">
            <button type="button" onClick={() => router.push('/admin/events')} className="text-sm font-bold text-[var(--color-accent)] hover:underline">
              {isAr ? 'إنهاء لاحقًا والعودة إلى القائمة' : 'Finish later — back to the list'}
            </button>
            {userData?.isSuperAdmin && (
              <button type="button" disabled={deleting} onClick={() => setConfirmingDelete(true)}
                className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold disabled:opacity-40"
                style={{ color: 'var(--color-danger)', backgroundColor: 'var(--color-danger-soft)' }}>
                <Trash2 size={15} />{deleting ? (isAr ? 'جارٍ الحذف...' : 'Deleting...') : (isAr ? 'حذف الفعالية نهائيًا' : 'Permanently delete event')}
              </button>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmingDelete}
        icon={<Trash2 className="w-6 h-6" />}
        tone="danger"
        confirmWord="Delete"
        title={isAr ? 'حذف هذه الفعالية نهائيًا؟' : 'Permanently delete this event?'}
        message={isAr
          ? 'سيُحذف التسجيل والحضور والشهادات المرتبطة بها ولا يمكن التراجع. اكتب Delete للتأكيد.'
          : 'Its registrations, attendance and certificates are deleted too. This cannot be undone. Type Delete to confirm.'}
        confirmLabel={isAr ? 'حذف نهائيًا' : 'Delete permanently'}
        cancelLabel={isAr ? 'إلغاء' : 'Cancel'}
        busy={deleting}
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={async () => {
          if (!eventId) return;
          setDeleting(true);
          try {
            await httpsCallable(null, 'deleteEvent')({ eventId });
            router.push('/admin/events');
          } catch (error) {
            showToast(error instanceof Error ? error.message : (isAr ? 'تعذر حذف الفعالية.' : 'Could not delete the event.'), 'error');
            setDeleting(false);
            setConfirmingDelete(false);
          }
        }}
      />
    </div>
  );
}
