'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { Loader2, Smartphone } from 'lucide-react';
import { apiGet, apiSend } from '@/lib/backend';
import { useToast } from '@/context/ToastContext';

/** Super-admin switch: must staff install the app and confirm a test notification before the admin board opens? */
export default function OnboardingSettings() {
  const isAr = useLocale() === 'ar';
  const { showToast } = useToast();
  const [requireApp, setRequireApp] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    apiGet<{ requireApp: boolean }>('/api/admin/onboarding-settings').then(result => { if (active) setRequireApp(result.requireApp); }).catch(() => { if (active) setRequireApp(true); });
    return () => { active = false; };
  }, []);

  const change = async (next: boolean) => {
    setSaving(true);
    try {
      await apiSend('PUT', '/api/admin/onboarding-settings', { requireApp: next });
      setRequireApp(next);
      showToast(isAr ? 'تم الحفظ.' : 'Saved.', 'success');
    } catch (reason) { showToast(reason instanceof Error ? reason.message : (isAr ? 'تعذر الحفظ.' : 'Could not save.'), 'error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-2xl space-y-4">
      <header className="space-y-1">
        <h2 className="flex items-center gap-2 text-lg font-black"><Smartphone size={18} />{isAr ? 'إعداد الدخول الأول وتطبيق الجوال' : 'First sign-in setup & the app'}</h2>
        <p className="text-sm text-[var(--color-text-secondary)]">
          {isAr ? 'عند أول دخول إلى لوحة الإدارة يُطلب من كل عضو ومنظم ومدير إكمال بياناته الشخصية (الأسماء بالعربية والإنجليزية). ويمكنك أيضًا إلزامهم بتثبيت التطبيق وتفعيل الإشعارات وتأكيد وصول إشعار تجريبي.' : 'On first entering the admin board every member, organizer and super admin must complete their profile (Arabic and English names). You can also require them to install the app, enable notifications and confirm a test notification.'}
        </p>
      </header>
      <label className="flex items-start gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <input type="checkbox" className="mt-1" checked={requireApp ?? true} disabled={requireApp === null || saving} onChange={e => void change(e.target.checked)} />
        <span className="space-y-1 text-sm">
          <b>{isAr ? 'إلزام تثبيت التطبيق وتفعيل الإشعارات' : 'Require the installed app and notifications'}</b>
          <span className="block text-xs text-[var(--color-text-muted)]">{isAr ? 'عند الإيقاف يكتفي النظام بإكمال البيانات الشخصية، وتبقى الإشعارات اختيارية.' : 'When off, only the profile is required and notifications stay optional.'}</span>
        </span>
        {saving && <Loader2 size={16} className="animate-spin" />}
      </label>
    </div>
  );
}
