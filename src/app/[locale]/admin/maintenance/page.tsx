'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { useAuth } from '@/context/AuthContext';
import { httpsCallable } from '@/lib/backend';
import { AdminError, AdminLoading } from '@/components/admin/AdminData';

export default function AdminMaintenancePage() {
  const isAr = useLocale() === 'ar';
  const { userData } = useAuth();
  const [on, setOn] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true); setError(null);
    try { const result = await httpsCallable<unknown, { on: boolean }>(null, 'getMaintenanceStatus')({}); setOn(result.data.on); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load maintenance status'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const toggle = async (next: boolean) => {
    if (busy) return;
    const confirmed = window.confirm(next
      ? (isAr ? 'سيتم إخفاء الموقع عن جميع الزوار العاديين فورًا. الاستمرار؟' : 'This immediately hides the site from all regular visitors. Continue?')
      : (isAr ? 'سيعود الموقع متاحًا لجميع الزوار. الاستمرار؟' : 'This brings the site back for all visitors. Continue?'));
    if (!confirmed) return;
    setBusy(true); setError(null);
    try { await httpsCallable(null, 'setMaintenanceMode')({ on: next }); setOn(next); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to update maintenance status'); }
    finally { setBusy(false); }
  };

  if (userData?.role !== 'super_admin') return <AdminError message={isAr ? 'وضع الصيانة مخصص للمدير العام.' : 'Maintenance mode requires super admin access.'} />;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-black font-cairo">{isAr ? 'وضع الصيانة' : 'Maintenance mode'}</h1>
        <p className="mt-2 text-sm text-slate-500">
          {isAr
            ? 'يعرض هذا المفتاح صفحة صيانة لكل الزوار بينما يحتفظ المديرون بوصول كامل وطبيعي عبر تسجيل الدخول. لا يعتمد على قاعدة البيانات، لذا يبقى يعمل حتى أثناء ترحيل البنية التقنية.'
            : 'This switch shows a maintenance page to every visitor while admins keep full, normal access by signing in. It does not depend on the database, so it keeps working even during an infrastructure migration.'}
        </p>
      </header>
      {error && <AdminError message={error} retry={load} />}
      {loading ? <AdminLoading /> : on === null ? null : (
        <section className="rounded-2xl border bg-white p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-lg font-bold">{isAr ? 'الحالة الحالية' : 'Current status'}</p>
            <p className={`mt-1 text-sm font-bold ${on ? 'text-red-600' : 'text-emerald-600'}`}>
              {on ? (isAr ? 'مفعّل — الموقع يعرض صفحة الصيانة للزوار' : 'Enabled — visitors see the maintenance page') : (isAr ? 'متوقف — الموقع يعمل بشكل طبيعي' : 'Off — the site is running normally')}
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void toggle(!on)}
            className={`rounded-xl px-5 py-3 font-bold text-white transition-all disabled:opacity-50 ${on ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
          >
            {busy ? (isAr ? 'جارٍ التحديث…' : 'Updating…') : on ? (isAr ? 'إيقاف الصيانة' : 'Turn maintenance off') : (isAr ? 'تفعيل الصيانة' : 'Turn maintenance on')}
          </button>
        </section>
      )}
    </div>
  );
}
