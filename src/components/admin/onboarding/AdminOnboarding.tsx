'use client';

import { useCallback, useEffect, useState } from 'react';
import { BellRing, CheckCircle2, Circle, Download, Loader2, Share, ShieldCheck, Smartphone, UserRound } from 'lucide-react';
import { apiGet, apiSend, httpsCallable } from '@/lib/backend';
import { useAuth } from '@/context/AuthContext';
import { enableNotifications, installAvailable, isIos, isStandalone, onInstallChange, promptInstall, pushSupported, refreshDevice } from '@/lib/pwa';

export interface OnboardingState {
  required: boolean; requireApp: boolean; missingProfile: string[]; installed: boolean; devices: number; testConfirmed: boolean;
  steps: { profile: boolean; installed: boolean; notifications: boolean; tested: boolean }; complete: boolean;
}

const field = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00629B]';
const primary = 'inline-flex items-center justify-center gap-2 rounded-xl bg-[#00629B] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#004f7c] disabled:cursor-not-allowed disabled:opacity-50';
const ghost = 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50';

function Step({ n, done, active, icon: Icon, title, children }: { n: number; done: boolean; active: boolean; icon: typeof UserRound; title: string; children: React.ReactNode }) {
  return (
    <section className={`rounded-2xl border p-4 sm:p-5 transition ${done ? 'border-emerald-200 bg-emerald-50/60' : active ? 'border-[#00629B]/40 bg-white shadow-md' : 'border-slate-200 bg-white/60 opacity-70'}`}>
      <header className="flex items-center gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${done ? 'bg-emerald-500 text-white' : 'bg-[#00629B]/10 text-[#00629B]'}`}>
          {done ? <CheckCircle2 size={20} /> : <Icon size={20} />}
        </span>
        <h2 className="flex-1 text-base font-black text-slate-900">{n}. {title}</h2>
        {done ? <span className="text-xs font-bold text-emerald-600">✓</span> : <Circle size={14} className="text-slate-300" />}
      </header>
      {(active || done) && <div className="mt-4 space-y-3 text-sm text-slate-700">{children}</div>}
    </section>
  );
}

/**
 * First-run setup for staff (members, organizers, super admins): complete the profile, install the app, enable notifications
 * and confirm a test notification. Shown instead of the admin board until everything is done.
 */
export default function AdminOnboarding({ isAr, state, onChanged }: { isAr: boolean; state: OnboardingState; onChanged: () => Promise<void> }) {
  const t = (ar: string, en: string) => isAr ? ar : en;
  const { userData, refreshUser, logout } = useAuth();
  const [names, setNames] = useState({ firstName: userData?.firstName ?? '', fatherName: userData?.fatherName ?? '', familyName: userData?.familyName ?? '', englishName: userData?.englishFullName ?? '' });
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [installable, setInstallable] = useState(installAvailable());
  const [sentTest, setSentTest] = useState(false);
  const standalone = isStandalone();
  const ios = isIos();

  useEffect(() => onInstallChange(() => setInstallable(installAvailable())), []);
  // Opened inside the installed app: tell the server so the "install" step is recognised.
  useEffect(() => { if (standalone) void refreshDevice().then(onChanged); }, [standalone, onChanged]);

  const run = async (name: string, action: () => Promise<void>) => {
    setBusy(name); setError('');
    try { await action(); } catch (reason) { setError(reason instanceof Error ? reason.message : t('تعذر إكمال الطلب.', 'Request failed.')); }
    finally { setBusy(''); }
  };

  const saveProfile = () => run('profile', async () => {
    const latin = /^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ .'’-]*$/;
    if (!names.firstName.trim() || !names.fatherName.trim() || !names.familyName.trim()) throw new Error(t('أدخل الاسم الأول واسم الأب واسم العائلة بالعربية.', 'Enter the first, father and family names in Arabic.'));
    if (!latin.test(names.englishName.trim())) throw new Error(t('أدخل الاسم الكامل بالإنجليزية بحروف لاتينية.', 'Enter your full name in English (Latin letters).'));
    await httpsCallable(null, 'saveProfile')({ ...names, isQassimStudent: userData?.isQassimStudent ?? false });
    await refreshUser(); await onChanged();
  });
  const install = () => run('install', async () => { await promptInstall(); await onChanged(); });
  const enable = () => run('enable', async () => { await enableNotifications(); await onChanged(); });
  const test = () => run('test', async () => { await apiSend('POST', '/api/me/push/test'); setSentTest(true); });
  const confirm = () => run('confirm', async () => { await apiSend('POST', '/api/me/push/confirm'); await onChanged(); });

  const { steps } = state;
  const next = !steps.profile ? 'profile' : !steps.installed ? 'installed' : !steps.notifications ? 'notifications' : !steps.tested ? 'tested' : 'done';
  const total = state.requireApp ? 4 : 1;
  const completed = state.requireApp ? Object.values(steps).filter(Boolean).length : (steps.profile ? 1 : 0);

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} className="min-h-screen bg-gradient-to-b from-slate-50 to-sky-50 px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-2xl space-y-5">
        <header className="space-y-3 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#00629B] text-white shadow-lg"><ShieldCheck size={28} /></span>
          <h1 className="font-cairo text-2xl font-black text-slate-900 sm:text-3xl">{t('أهلًا بك في لوحة الإدارة', 'Welcome to the admin board')}</h1>
          <p className="text-sm text-slate-600">{t('أكمل هذه الخطوات القصيرة لتبدأ. تحتاجها لاستلام إشعارات المهام والمشاريع ومراحل الفعاليات.', 'Finish these quick steps to get started. You need them to receive task, project and event-stage notifications.')}</p>
          <div className="mx-auto h-2 max-w-sm overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuenow={completed} aria-valuemin={0} aria-valuemax={total}>
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(completed / total) * 100}%` }} />
          </div>
        </header>

        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <Step n={1} done={steps.profile} active={next === 'profile'} icon={UserRound} title={t('بياناتك الشخصية', 'Your profile')}>
          {steps.profile ? <p>{t('تم حفظ بياناتك.', 'Your details are saved.')}</p> : (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {([['firstName', 'الاسم الأول', 'First name (Arabic)'], ['fatherName', 'اسم الأب', 'Father name (Arabic)'], ['familyName', 'اسم العائلة', 'Family name (Arabic)']] as const).map(([key, ar, en]) => (
                  <label key={key} className="block space-y-1 text-xs font-bold text-slate-600"><span>{t(ar, en)}</span>
                    <input className={field} dir="rtl" value={names[key]} onChange={e => setNames({ ...names, [key]: e.target.value })} /></label>
                ))}
              </div>
              <label className="block space-y-1 text-xs font-bold text-slate-600"><span>{t('الاسم الكامل بالإنجليزية', 'Full name in English')}</span>
                <input className={field} dir="ltr" value={names.englishName} onChange={e => setNames({ ...names, englishName: e.target.value })} placeholder="Ahmed Sameh Ali" /></label>
              <p className="text-xs text-slate-500">{t('يُستخدم اسمك العربي والإنجليزي في الشهادات والرسائل والتقارير.', 'Your Arabic and English names appear on certificates, e-mails and reports.')}</p>
              <button type="button" className={primary} disabled={busy !== ''} onClick={() => void saveProfile()}>
                {busy === 'profile' && <Loader2 size={16} className="animate-spin" />}{t('حفظ ومتابعة', 'Save & continue')}
              </button>
            </>
          )}
        </Step>

        {state.requireApp && (
          <>
            <Step n={2} done={steps.installed} active={next === 'installed'} icon={Smartphone} title={t('ثبّت التطبيق', 'Install the app')}>
              {steps.installed ? <p>{t('التطبيق مثبّت.', 'The app is installed.')}</p> : standalone ? (
                <p>{t('أنت داخل التطبيق؛ سيُسجَّل تثبيته بعد تفعيل الإشعارات في الخطوة التالية.', 'You are inside the app; its installation is recorded once you enable notifications in the next step.')}</p>
              ) : (
                <>
                  <p>{t('ثبّت تطبيق IEEE القصيم على جهازك لتصلك الإشعارات حتى وهو مغلق. بعد التثبيت افتحه من شاشتك الرئيسية أو قائمة التطبيقات وسجّل الدخول لإكمال بقية الخطوات.', 'Install the IEEE Qassim app so notifications reach you even when it is closed. After installing, open it from your home screen or app list and sign in to finish the remaining steps.')}</p>
                  {installable && <button type="button" className={primary} disabled={busy !== ''} onClick={() => void install()}><Download size={16} />{t('تثبيت التطبيق', 'Install the app')}</button>}
                  {!installable && ios && (
                    <p className="flex flex-wrap items-center gap-1 rounded-xl bg-sky-50 p-3 leading-7">{t('في Safari اضغط', 'In Safari tap')} <Share size={16} className="inline text-[#00629B]" /> {t('ثم «إضافة إلى الشاشة الرئيسية»، وبعدها افتح التطبيق من الشاشة الرئيسية.', 'then “Add to Home Screen”, then open the app from your home screen.')}</p>
                  )}
                  {!installable && !ios && <p className="rounded-xl bg-sky-50 p-3 leading-7">{t('من قائمة المتصفح (⋮) اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية». إن لم يظهر الخيار فجرّب Chrome أو Edge.', 'From the browser menu (⋮) choose “Install app” or “Add to Home screen”. If you do not see it, try Chrome or Edge.')}</p>}
                </>
              )}
            </Step>

            <Step n={3} done={steps.notifications} active={next === 'notifications'} icon={BellRing} title={t('فعّل الإشعارات', 'Turn on notifications')}>
              {steps.notifications ? <p>{t('الإشعارات مفعّلة على جهازك.', 'Notifications are on for your device.')}</p> : (
                <>
                  <p>{t('سنرسل لك إشعارًا عند إسناد مهمة إليك، وتحديث مشروع، ووصول دور فريقك في إحدى مراحل الفعالية.', 'You will be notified when a task is assigned to you, a project changes, or it is your team’s turn on an event stage.')}</p>
                  {!pushSupported() && <p className="rounded-xl bg-amber-50 p-3 text-amber-800">{t('هذا المتصفح لا يدعم الإشعارات؛ استخدم التطبيق المثبّت أو Chrome/Edge/Safari حديثًا.', 'This browser does not support notifications; use the installed app or a recent Chrome/Edge/Safari.')}</p>}
                  <button type="button" className={primary} disabled={busy !== '' || !pushSupported()} onClick={() => void enable()}>
                    {busy === 'enable' && <Loader2 size={16} className="animate-spin" />}<BellRing size={16} />{t('تفعيل الإشعارات', 'Enable notifications')}
                  </button>
                </>
              )}
            </Step>

            <Step n={4} done={steps.tested} active={next === 'tested'} icon={BellRing} title={t('جرّب إشعارًا', 'Try a notification')}>
              {steps.tested ? <p>{t('وصلك الإشعار التجريبي.', 'The test notification reached you.')}</p> : (
                <>
                  <p>{t('أرسل إشعارًا تجريبيًا إلى جهازك الآن، ثم أكّد وصوله.', 'Send a test notification to your device now, then confirm it arrived.')}</p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className={primary} disabled={busy !== ''} onClick={() => void test()}>{busy === 'test' && <Loader2 size={16} className="animate-spin" />}{sentTest ? t('إعادة الإرسال', 'Send again') : t('إرسال إشعار تجريبي', 'Send a test notification')}</button>
                    {sentTest && <button type="button" className={ghost} disabled={busy !== ''} onClick={() => void confirm()}><CheckCircle2 size={16} />{t('نعم، وصلني الإشعار', 'Yes, I got it')}</button>}
                  </div>
                  {sentTest && <p className="text-xs text-slate-500">{t('لم يصل؟ تأكد من السماح بالإشعارات للتطبيق في إعدادات الجهاز ثم أعد الإرسال.', 'Nothing yet? Make sure notifications are allowed for the app in your device settings, then send again.')}</p>}
                </>
              )}
            </Step>
          </>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button type="button" className={ghost} onClick={() => void logout()}>{t('تسجيل الخروج', 'Sign out')}</button>
          {next === 'done' && <button type="button" className={primary} onClick={() => void onChanged()}>{t('ابدأ', 'Get started')}</button>}
        </div>
      </div>
    </div>
  );
}

/** Loads the signed-in staff member's setup state; fails open (never locks anyone out because of a network error). */
export function useOnboarding(enabled: boolean) {
  const [state, setState] = useState<OnboardingState | null>(null);
  const [checked, setChecked] = useState(false);
  const reload = useCallback(async () => {
    try { setState(await apiGet<OnboardingState>('/api/me/onboarding')); }
    catch { setState(null); }
    finally { setChecked(true); }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (enabled) void reload(); }, [enabled, reload]);
  return { state, checked: !enabled || checked, reload };
}
