'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { LockKeyhole, Save, ShieldCheck } from 'lucide-react';
import { apiGet, apiSend } from '@/lib/backend';
import { useToast } from '@/context/ToastContext';

interface SenderSettings {
  senderEmail: string; senderName: string; enabled: boolean; revision: number;
  passwordConfigured: boolean; encryptedStorageReady: boolean;
}
const input = 'w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm';

export default function EmailSettings() {
  const isAr = useLocale() === 'ar';
  const t = (ar: string, en: string) => isAr ? ar : en;
  const { showToast } = useToast();
  const [data, setData] = useState<SenderSettings | null>(null);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setError('');
    try { setData(await apiGet<SenderSettings>('/api/admin/mail/settings')); setPassword(''); setDirty(false); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load sender settings'); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!data) return;
    setBusy(true);
    try {
      const result = await apiSend<SenderSettings>('PUT', '/api/admin/mail/settings', {
        senderEmail: data.senderEmail, senderName: data.senderName, enabled: data.enabled,
        appPassword: password, revision: data.revision,
      });
      setData(result); setPassword(''); setDirty(false); showToast(t('تم حفظ إعدادات المرسل.', 'Sender settings saved.'), 'success');
    } catch (reason) { showToast(reason instanceof Error ? reason.message : 'Unable to save', 'error'); } finally { setBusy(false); }
  };
  const verify = async () => {
    setBusy(true);
    try { await apiSend('POST', '/api/admin/mail/settings/verify'); showToast(t('نجح اتصال SMTP وتسجيل الدخول. لم يتم إرسال أي رسالة.', 'SMTP connection and authentication succeeded. No email was sent.'), 'success'); }
    catch (reason) { showToast(reason instanceof Error ? reason.message : 'Verification failed', 'error'); } finally { setBusy(false); }
  };
  return <section className="space-y-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-7">
    <header className="flex items-start gap-3"><LockKeyhole className="mt-1 shrink-0 text-[var(--color-accent)]" /><div><h2 className="text-xl font-bold">{t('إعدادات البريد المرسل', 'Email sender settings')}</h2><p className="mt-2 text-sm text-[var(--color-text-secondary)]">{t('متاحة للمدير العام وحاملي شارة Technician فقط. تستخدم جميع رسائل الموقع هذا الحساب.', 'Only super admins and Technician badge holders can view or edit these settings. All website emails use this account.')}</p></div></header>
    {error && <div role="alert" className="rounded-xl bg-red-500/10 p-4 text-red-600">{error}<button type="button" disabled={busy} onClick={() => void load()} className="ms-3 underline">{t('إعادة تحميل', 'Reload')}</button></div>}
    {!data ? <p>{t('جارٍ تحميل الإعدادات…', 'Loading settings…')}</p> : <form onSubmit={save} className="space-y-5">
      <fieldset disabled={busy} className="space-y-4">
        <label className="block space-y-2"><span>{t('بريد المرسل في Google Workspace', 'Google Workspace sender email')}</span><input dir="ltr" type="email" required maxLength={254} autoComplete="off" className={input} value={data.senderEmail} onChange={event => { setDirty(true); setData({ ...data, senderEmail: event.target.value }); }} /></label>
        <label className="block space-y-2"><span>{t('اسم المرسل', 'Sender display name')}</span><input maxLength={100} className={input} value={data.senderName} onChange={event => { setDirty(true); setData({ ...data, senderName: event.target.value }); }} /></label>
        <label className="block space-y-2"><span>{t('كلمة مرور التطبيق', 'App password')}</span><input dir="ltr" type="password" autoComplete="new-password" spellCheck={false} maxLength={32} className={input} value={password} placeholder={data.passwordConfigured ? t('محفوظة — اترك الحقل فارغًا للاحتفاظ بها', 'Configured — leave blank to keep it') : t('أدخل كلمة مرور التطبيق', 'Enter the app password')} onChange={event => { setDirty(true); setPassword(event.target.value); }} /><span className="block text-xs text-[var(--color-text-muted)]">{t('لن تُعرض كلمة المرور المحفوظة. تغيير عنوان المرسل يتطلب كلمة مرور خاصة بالحساب الجديد.', 'The stored password is never returned. Changing the sender address requires the new account’s app password.')}</span></label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={data.enabled} onChange={event => { setDirty(true); setData({ ...data, enabled: event.target.checked }); }} />{t('تفعيل إرسال البريد', 'Enable email delivery')}</label>
      </fieldset>
      {!data.encryptedStorageReady && <p className="rounded-xl bg-amber-500/10 p-4 text-sm text-amber-700">{t('يلزم إعداد مفتاح تشفير البريد على الخادم قبل حفظ بيانات الحساب.', 'The server email-encryption key must be configured before saving credentials.')}</p>}
      <div className="flex flex-wrap gap-3"><button type="submit" disabled={busy || !data.encryptedStorageReady} className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 py-2.5 font-bold text-[var(--color-accent-contrast)] disabled:opacity-50"><Save size={17} />{t('حفظ الإعدادات', 'Save settings')}</button><button type="button" disabled={busy || dirty || !data.passwordConfigured} onClick={() => void verify()} className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] px-4 py-2.5 font-bold disabled:opacity-50"><ShieldCheck size={17} />{t('اختبار الاتصال المحفوظ', 'Verify saved connection')}</button></div>
      <p className="text-xs text-[var(--color-text-muted)]">{t('التغييرات تطبق على الرسائل المنتظرة عند تسليمها. تعطيل الإرسال يُبقي الرسائل في قائمة الانتظار.', 'Changes apply to queued messages at delivery time. Disabling delivery keeps messages queued.')}</p>
    </form>}
  </section>;
}
