'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { useAuth } from '@/context/AuthContext';
import { Wrench, ShieldCheck } from 'lucide-react';

export default function MaintenancePage() {
  const isAr = useLocale() === 'ar';
  const { user, userData, loading, error, login } = useAuth();
  const [status, setStatus] = useState<'idle' | 'checking' | 'denied' | 'error'>('idle');
  const attempted = useRef(false);

  useEffect(() => {
    if (loading || !user || !userData || attempted.current) return;
    attempted.current = true;
    setStatus('checking');
    void (async () => {
      try {
        const token = await user.getIdToken();
        const response = await fetch('/api/maintenance-bypass', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
        // Full reload, not a soft nav: the proxy must see the freshly set cookie on the next request.
        if (response.ok) { window.location.href = '/'; return; }
        // A non-admin account stays signed in but gets no access: every route still renders this same screen.
        setStatus('denied');
      } catch {
        setStatus('error');
        attempted.current = false;
      }
    })();
  }, [loading, user, userData]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center gap-6 px-4 text-center">
      <Wrench className="w-14 h-14 text-purple-600" />
      <div>
        <h1 className="text-2xl sm:text-3xl font-black font-cairo text-slate-800">
          {isAr ? 'الموقع تحت الصيانة مؤقتًا' : 'The site is temporarily under maintenance'}
        </h1>
        <p className="mt-3 max-w-md text-slate-500">
          {isAr
            ? 'نقوم بترحيل البنية التقنية للموقع. سنعود خلال الساعات القادمة. يمكن لفريق الإدارة تسجيل الدخول للمتابعة.'
            : "We're migrating the site's infrastructure. We'll be back within a few hours. The admin team can sign in to continue working."}
        </p>
      </div>
      {status === 'checking' ? (
        <p role="status" className="text-sm text-slate-500">{isAr ? 'جارٍ التحقق من صلاحياتك…' : 'Checking your access…'}</p>
      ) : (
        <button
          type="button"
          onClick={() => { attempted.current = false; setStatus('idle'); void login(); }}
          className="inline-flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 font-bold transition-all"
        >
          <ShieldCheck className="w-5 h-5" />
          {isAr ? 'تسجيل دخول المسؤول' : 'Admin sign in'}
        </button>
      )}
      {status === 'denied' && (
        <p role="alert" className="text-sm text-red-600 max-w-sm">
          {isAr ? 'هذا الحساب غير مخوّل بالدخول أثناء الصيانة.' : 'This account is not authorized during maintenance.'}
        </p>
      )}
      {(status === 'error' || error) && (
        <p role="alert" className="text-sm text-red-600 max-w-sm">
          {error || (isAr ? 'تعذر إكمال تسجيل الدخول. أعد المحاولة.' : 'Could not complete sign-in. Please retry.')}
        </p>
      )}
    </div>
  );
}
