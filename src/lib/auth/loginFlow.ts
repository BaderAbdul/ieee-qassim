export function authErrorCode(error: unknown): string {
  return typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
}

/** Cross-site redirect helpers lose state in browsers that partition third-party storage. */
export function canRedirectAfterPopup(error: unknown, authDomain: string | undefined, host: string): boolean {
  return authErrorCode(error) === 'auth/popup-blocked' && !!authDomain && authDomain.toLowerCase() === host.toLowerCase();
}

export function loginErrorMessage(error: unknown): string {
  const code = authErrorCode(error);
  if (code === 'auth/popup-blocked') return 'تعذر فتح نافذة Google. اسمح بالنوافذ المنبثقة لهذا الموقع ثم اضغط تسجيل الدخول مجدداً. / Allow popups for this site, then sign in again.';
  if (['auth/missing-initial-state', 'auth/invalid-credential'].includes(code)) return 'لم تكتمل العودة من Google. افتح الرابط في Safari أو Chrome وأعد تسجيل الدخول. / Google sign-in could not finish. Open this link in Safari or Chrome and sign in again.';
  if (code === 'auth/unauthorized-domain') return 'نطاق الموقع غير مفعّل لتسجيل الدخول. تواصل مع المنظم. / Sign-in is not configured for this site domain. Contact the organizer.';
  if (code === 'auth/network-request-failed') return 'تعذر الاتصال بخدمة تسجيل الدخول. تحقق من الاتصال وأعد المحاولة. / Could not reach sign-in. Check your connection and retry.';
  return 'تعذر إكمال تسجيل الدخول. أعد المحاولة. / Could not complete sign-in. Please retry.';
}


export interface RedirectAttempt { path: string; startedAt: number }
export function readRedirectAttempt(value: string | null, now = Date.now()): RedirectAttempt | null {
  try {
    const attempt = JSON.parse(value || 'null') as RedirectAttempt | null;
    if (!attempt || typeof attempt.startedAt !== 'number' || attempt.startedAt > now || now - attempt.startedAt > 15 * 60000 || typeof attempt.path !== 'string') return null;
    if (!attempt.path.startsWith('/') || attempt.path.startsWith('//') || /[\\\u0000-\u001f]/.test(attempt.path)) return null;
    const decoded = decodeURIComponent(attempt.path);
    if (decoded.startsWith('//') || /[\\\u0000-\u001f]/.test(decoded)) return null;
    const url = new URL(attempt.path, 'https://internal.invalid');
    if (url.origin !== 'https://internal.invalid' || /^\/(?:api|__)(?:\/|$)/.test(url.pathname)) return null;
    return { path: `${url.pathname}${url.search}${url.hash}`, startedAt: attempt.startedAt };
  } catch { return null; }
}
