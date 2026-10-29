import { arSA, enUS } from '@clerk/localizations';

// @clerk/localizations' ar-SA bundle leaves a handful of input placeholders undefined
// (they fall back to English) — fill the ones users actually see on the sign-in form.
const arSAFilled = {
  ...arSA,
  formFieldInputPlaceholder__emailAddress: 'ادخل بريدك الإلكتروني',
  formFieldInputPlaceholder__password: 'ادخل كلمة المرور',
};

export function getClerkLocalization(locale: string) {
  return locale === 'ar' ? arSAFilled : enUS;
}
