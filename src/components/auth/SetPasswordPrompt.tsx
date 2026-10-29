'use client';

import { useState, type FormEvent } from 'react';
import { useLocale } from 'next-intl';
import { useClerk, useUser, useReverification } from '@clerk/nextjs';
import { Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react';

export default function SetPasswordPrompt() {
  const isAr = useLocale() === 'ar';
  const { user } = useUser();
  const clerk = useClerk();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const updatePassword = useReverification((password: string) => {
    if (!user) throw new Error('Please sign in again.');
    return user.updatePassword({ newPassword: password, signOutOfOtherSessions: false });
  });

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setError('');
    if (newPassword.length < 8) {
      setError(isAr ? 'يجب أن تتكون كلمة المرور من 8 أحرف على الأقل.' : 'Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(isAr ? 'كلمتا المرور غير متطابقتين.' : 'Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      const updated = await updatePassword(newPassword);
      // Cancelled reverification must never unlock the site. The parent gate
      // only releases when Clerk's user resource reports passwordEnabled.
      if (!updated?.passwordEnabled) {
        setError(isAr ? 'لم يتم إنشاء كلمة المرور. أكمل التحقق ثم أعد المحاولة.' : 'Password was not created. Complete verification and try again.');
        return;
      }
      await user?.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : (isAr ? 'تعذر إنشاء كلمة المرور. حاول مرة أخرى.' : 'Could not set password. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section dir={isAr ? 'rtl' : 'ltr'} aria-labelledby="required-password-title" className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-slate-50 px-4 py-8 flex items-safe-center justify-center">
      <form onSubmit={handleSubmit} className="my-auto w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl text-start space-y-5">
        <KeyRound className="h-9 w-9 text-blue-600" aria-hidden="true" />
        <div>
          <h1 id="required-password-title" className="text-xl font-black text-slate-900">{isAr ? 'إنشاء كلمة مرور مطلوب' : 'Create a password to continue'}</h1>
          <p className="mt-2 text-sm text-slate-600">{isAr ? 'يجب إنشاء كلمة مرور قبل استخدام الموقع، حتى عند تسجيل الدخول باستخدام Google.' : 'You must create a password before using the website, including when signing in with Google.'}</p>
        </div>
        <div>
          <label htmlFor="required-password" className="mb-1 block text-sm font-bold text-slate-700">{isAr ? 'كلمة المرور الجديدة' : 'New password'}</label>
          <div className="relative">
            <input id="required-password" type={visible ? 'text' : 'password'} autoComplete="new-password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full rounded-xl border border-slate-200 p-3 pe-12 outline-none focus:ring-2 focus:ring-blue-500" minLength={8} required autoFocus disabled={submitting} />
            <button type="button" onClick={() => setVisible(value => !value)} aria-label={visible ? (isAr ? 'إخفاء كلمة المرور' : 'Hide password') : (isAr ? 'إظهار كلمة المرور' : 'Show password')} aria-pressed={visible} className="absolute end-0 top-0 p-3 text-slate-500">{visible ? <EyeOff /> : <Eye />}</button>
          </div>
        </div>
        <div>
          <label htmlFor="required-password-confirm" className="mb-1 block text-sm font-bold text-slate-700">{isAr ? 'تأكيد كلمة المرور' : 'Confirm password'}</label>
          <input id="required-password-confirm" type={visible ? 'text' : 'password'} autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:ring-2 focus:ring-blue-500" minLength={8} required disabled={submitting} />
        </div>
        {error && <p role="alert" className="text-sm font-bold text-red-600">{error}</p>}
        <button type="submit" disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-50">
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isAr ? 'إنشاء كلمة المرور والمتابعة' : 'Create password and continue'}
        </button>
        <button type="button" disabled={submitting} onClick={() => { void clerk.signOut().catch(() => setError(isAr ? 'تعذر تسجيل الخروج. حاول مرة أخرى.' : 'Could not sign out. Please try again.')); }} className="w-full text-sm font-bold text-slate-500 disabled:opacity-50">{isAr ? 'تسجيل الخروج' : 'Sign out'}</button>
      </form>
    </section>
  );
}
