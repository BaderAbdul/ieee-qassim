import { BadgeCheck, ShieldX } from 'lucide-react';
import { setRequestLocale } from 'next-intl/server';
import { API_BASE_URL } from '@/lib/apiBase';

export const revalidate = 60;

interface Verification { valid: boolean; revoked?: boolean; kind?: 'student' | 'speaker' | 'interviewer'; holderName?: string; eventTitle?: string; issueDate?: string }

export default async function VerifyCertificatePage({ params }: { params: Promise<{ locale: string; code: string }> }) {
  const { locale, code } = await params;
  setRequestLocale(locale);
  const isAr = locale === 'ar';
  let result: Verification = { valid: false };
  try {
    const response = await fetch(`${API_BASE_URL}/api/public/certificates/${encodeURIComponent(code)}`, {
      next: { revalidate: 60 }, signal: AbortSignal.timeout(10000),
    });
    if (response.ok) result = await response.json() as Verification;
  } catch { /* shown as "not found" below */ }

  const role = result.kind === 'speaker' ? (isAr ? 'متحدث' : 'Speaker') : result.kind === 'interviewer' ? (isAr ? 'محاور' : 'Interviewer') : (isAr ? 'مشارك' : 'Participant');
  const date = result.issueDate ? new Date(result.issueDate).toLocaleDateString(isAr ? 'ar-SA' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Riyadh' }) : '';

  return (
    <div className="min-h-screen bg-slate-50 px-4 pb-12 pt-28">
      <div className="mx-auto max-w-lg space-y-5 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        {result.valid ? (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><BadgeCheck className="h-9 w-9" /></div>
            <h1 className="font-cairo text-2xl font-black text-slate-900">{isAr ? 'شهادة موثّقة' : 'Verified certificate'}</h1>
            <dl className="space-y-3 text-start text-sm">
              <div><dt className="text-xs font-bold text-slate-500">{isAr ? 'اسم حامل الشهادة' : 'Holder'}</dt><dd className="text-lg font-black text-slate-900">{result.holderName}</dd></div>
              <div><dt className="text-xs font-bold text-slate-500">{isAr ? 'الفعالية' : 'Event'}</dt><dd className="font-bold text-slate-800">{result.eventTitle}</dd></div>
              <div><dt className="text-xs font-bold text-slate-500">{isAr ? 'الصفة' : 'Role'}</dt><dd className="font-bold text-slate-800">{role}</dd></div>
              {date && <div><dt className="text-xs font-bold text-slate-500">{isAr ? 'تاريخ الإصدار' : 'Issued on'}</dt><dd className="font-bold text-slate-800">{date}</dd></div>}
            </dl>
          </>
        ) : (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-500"><ShieldX className="h-9 w-9" /></div>
            <h1 className="font-cairo text-2xl font-black text-slate-900">{result.revoked ? (isAr ? 'شهادة ملغاة' : 'Revoked certificate') : (isAr ? 'لم نجد هذه الشهادة' : 'Certificate not found')}</h1>
            <p className="text-sm text-slate-600">{isAr ? 'تحقق من الرمز المطبوع على الشهادة وأعد المحاولة.' : 'Check the ID printed on the certificate and try again.'}</p>
          </>
        )}
        <p dir="ltr" className="font-mono text-xs text-slate-400">{code}</p>
      </div>
    </div>
  );
}
