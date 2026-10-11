'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';

interface Readiness { platformConfigured: boolean; mediaConfigured: boolean; email: string; configurationOnly: boolean }

export default function ConfigurationNotice() {
  const isAr = useLocale() === 'ar';
  const [status, setStatus] = useState<Readiness | null>(null);
  const [error, setError] = useState(false); const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); const timer = window.setTimeout(() => controller.abort(), 10000);
    let active = true;
    const load = async () => {
      try {
        const response = await fetch('/api/readiness', { cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (typeof data.platformConfigured !== 'boolean' || typeof data.mediaConfigured !== 'boolean' || data.configurationOnly !== true) throw new Error();
        if (active) { setStatus(data); setError(false); }
      } catch { if (active) setError(true); }
      finally { window.clearTimeout(timer); }
    };
    void load(); return () => { active = false; controller.abort(); window.clearTimeout(timer); };
  }, [revision]);
  if (!error && (!status || (status.platformConfigured && status.mediaConfigured && status.email !== 'incomplete'))) return null;
  return <aside role="status" className="mb-6 space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
    <h2 className="font-bold">{isAr ? 'جاهزية إعدادات هذه النسخة' : 'This deployment’s configuration readiness'}</h2>
    {error ? <><p>{isAr ? 'تعذر التحقق من الإعدادات. لا تعتبر هذه الرسالة تأكيدًا لجاهزية التشغيل.' : 'Configuration could not be checked. This does not confirm operational readiness.'}</p><button type="button" onClick={() => setRevision(value => value + 1)} className="rounded-lg border border-amber-300 px-3 py-2 font-bold">{isAr ? 'إعادة التحقق' : 'Check again'}</button></> : <>
      {!status?.platformConfigured && <p>{isAr ? 'إعدادات الخادم غير مكتملة لهذه النسخة؛ عمليات التسجيل والتحضير والنقاط لن تعمل حتى تجهيز بيئة مناسبة.' : 'Server configuration is incomplete here; registration, attendance and points operations require a configured environment.'}</p>}
      {!status?.mediaConfigured && <p>{isAr ? 'إعدادات Cloudinary غير مكتملة؛ رفع الصور وإصدار ملفات الشهادات غير جاهزين هنا.' : 'Cloudinary configuration is incomplete; image uploads and generated certificate files are not ready here.'}</p>}
      {status?.email === 'incomplete' && <p>{isAr ? 'الإشعارات البريدية مفعّلة لكن إعدادات الإرسال ناقصة.' : 'Email notifications are enabled but sender configuration is incomplete.'}</p>}
      <p>{isAr ? 'هذا فحص وجود الإعدادات فقط، وليس اختبارًا لصحة المفاتيح أو الفهارس أو التسليم الفعلي. لم تُنسخ أي مفاتيح من الإنتاج.' : 'This checks configuration presence only, not credential validity, indexes or actual delivery. No production credentials have been copied.'}</p>
    </>}
  </aside>;
}
