'use client';
import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { useRouter } from '@/i18n/routing';

/** The enclosing server page only exists in an explicitly enabled local demo. */
export default function DemoSignIn() {
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const router = useRouter();
  const signIn = async (role: 'organizer' | 'student') => {
    setBusy(true); setError('');
    try { await signInWithEmailAndPassword(auth, `${role}@example.test`, 'demo-local-password'); router.replace(role === 'organizer' ? '/admin' : '/events'); }
    catch { setError('تعذر دخول الحساب التجريبي. شغّل المحاكيات وبيانات العرض أولًا.'); }
    finally { setBusy(false); }
  };
  return <section className="mx-auto max-w-lg space-y-5 p-8"><h1 className="text-2xl font-bold">معاينة محلية · بيانات تجريبية</h1><p>هذه الصفحة غير متاحة في الإنتاج. الحسابات والفعاليات هنا داخل محاكيات Firebase فقط.</p><div className="flex flex-wrap gap-3"><button disabled={busy} onClick={() => void signIn('organizer')} className="rounded-xl bg-purple-600 p-3 font-bold text-white">دخول المنظم التجريبي</button><button disabled={busy} onClick={() => void signIn('student')} className="rounded-xl bg-blue-600 p-3 font-bold text-white">دخول الطالب التجريبي</button></div>{error && <p role="alert" className="text-red-700">{error}</p>}</section>;
}
