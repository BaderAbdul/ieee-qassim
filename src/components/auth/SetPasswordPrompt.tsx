'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useLocale } from 'next-intl';
import { useUser, useReverification } from '@clerk/nextjs';
import { KeyRound, X, Loader2, ShieldCheck } from 'lucide-react';

export default function SetPasswordPrompt() {
  const locale = useLocale();
  const isAr = locale === 'ar';
  const { isLoaded, isSignedIn, user } = useUser();
  const [dismissed, setDismissed] = useState(true);
  const [open, setOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const updatePassword = useReverification((newPw: string) =>
    user?.updatePassword({ newPassword: newPw, signOutOfOtherSessions: false })
  );

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) { setDismissed(true); return; }
    if (user.passwordEnabled) { setDismissed(true); return; }
    try {
      setDismissed(sessionStorage.getItem(`set-password-dismissed:${user.id}`) === '1');
    } catch {
      setDismissed(false);
    }
  }, [isLoaded, isSignedIn, user]);

  if (!isLoaded || !isSignedIn || !user || user.passwordEnabled || dismissed) return null;

  const handleDismiss = () => {
    try { sessionStorage.setItem(`set-password-dismissed:${user.id}`, '1'); } catch { /* best-effort */ }
    setDismissed(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
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
      await updatePassword(newPassword);
      setDone(true);
      setTimeout(handleDismiss, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : (isAr ? 'تعذر إنشاء كلمة المرور. حاول مرة أخرى.' : 'Could not set password. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <div className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:end-4 sm:w-96 z-[2147483000]">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 flex items-start gap-3">
          <div className="shrink-0 h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <KeyRound className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900">{isAr ? 'أضف كلمة مرور لحسابك' : 'Add a password to your account'}</p>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              {isAr ? 'دخلت بحساب Google فقط. أضف كلمة مرور لتتمكن من الدخول حتى بدونه.' : 'You signed in with Google only. Add a password so you can sign in even without it.'}
            </p>
            <div className="flex items-center gap-2 mt-3">
              <button onClick={() => setOpen(true)} className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors">
                {isAr ? 'إنشاء كلمة مرور' : 'Create password'}
              </button>
              <button onClick={handleDismiss} className="text-xs font-bold text-slate-500 hover:text-slate-700 px-2 py-1.5">
                {isAr ? 'لاحقاً' : 'Later'}
              </button>
            </div>
          </div>
          <button onClick={handleDismiss} aria-label={isAr ? 'إغلاق' : 'Close'} className="shrink-0 text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[2147483000] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-sm p-6">
        {done ? (
          <div className="text-center py-4">
            <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <p className="font-bold text-slate-900">{isAr ? 'تم إنشاء كلمة المرور بنجاح!' : 'Password created successfully!'}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <h3 className="font-black text-slate-900 font-cairo">{isAr ? 'إنشاء كلمة مرور' : 'Create a password'}</h3>
              <p className="text-xs text-slate-500 mt-1">{isAr ? 'سجلت دخولك بحساب Google. أضف كلمة مرور احتياطية.' : 'You signed in via Google. Add a backup password.'}</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{isAr ? 'كلمة المرور الجديدة' : 'New password'}</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full text-sm p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none" minLength={8} required autoFocus />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{isAr ? 'تأكيد كلمة المرور' : 'Confirm password'}</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full text-sm p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none" minLength={8} required />
            </div>
            {error && <p className="text-xs font-bold text-red-600">{error}</p>}
            <div className="flex items-center gap-2">
              <button type="submit" disabled={submitting} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {isAr ? 'حفظ' : 'Save'}
              </button>
              <button type="button" onClick={() => setOpen(false)} className="text-sm font-bold text-slate-500 hover:text-slate-700 px-3">
                {isAr ? 'رجوع' : 'Back'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
