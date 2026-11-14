'use client';

import { useRef, useState } from 'react';
import { Camera, Eye, EyeOff, Loader2, Trash2, X } from 'lucide-react';
import type { UserData } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { API_BASE_URL, httpsCallable, uploadImage } from '@/lib/backend';
import { readBackendResponse } from '@/lib/backendResponse';
import { normalizeStudentId } from '@/lib/studentExperience';
import { SOCIALS, type SocialKey } from './socials';

async function patchMe(data: Record<string, unknown>): Promise<void> {
  const token = await window.Clerk?.session?.getToken();
  if (!token) throw new Error('Sign in first. / سجّل دخولك أولًا.');
  const response = await fetch(`${API_BASE_URL}/api/me`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  await readBackendResponse(response);
}

function splitArabicName(userData: UserData | null) {
  const parts = (userData?.arabicFullName || '').split(' ').filter(Boolean);
  return {
    first: userData?.firstName || parts[0] || '',
    father: userData?.fatherName || (parts.length > 2 ? parts.slice(1, -1).join(' ') : parts.length === 2 ? parts[1] : ''),
    family: userData?.familyName || (parts.length > 2 ? parts[parts.length - 1] : ''),
  };
}

const field = 'w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] focus:border-[#00629B] focus:outline-none focus:ring-2 focus:ring-[#00629B]/20';

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 sm:p-5">
      <div>
        <h3 className="font-cairo text-base font-black text-[var(--color-text-primary)]">{title}</h3>
        {hint && <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Label({ text, children }: { text: string; children: React.ReactNode }) {
  return <label className="block space-y-1"><span className="text-xs font-bold text-[var(--color-text-secondary)]">{text}</span>{children}</label>;
}

/** One panel for everything a person can edit about themselves; saves only what changed. */
export default function ProfileSettingsPanel({ userData, isAr, onClose, onSaved }: {
  userData: UserData | null; isAr: boolean; onClose: () => void; onSaved: () => void;
}) {
  const { showToast } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const initialName = splitArabicName(userData);
  const [name, setName] = useState(initialName);
  const [englishName, setEnglishName] = useState(userData?.englishFullName || '');
  const [titleAr, setTitleAr] = useState(userData?.titleAr || '');
  const [titleEn, setTitleEn] = useState(userData?.titleEn || '');
  const [academic, setAcademic] = useState({
    college: userData?.college || '', major: userData?.major || '',
    academicLevel: userData?.academicLevel || '', universityId: userData?.universityId || '',
  });
  const [bio, setBio] = useState(userData?.publicProfile?.bio || '');
  const [showAvatar, setShowAvatar] = useState(userData?.publicProfile?.showAvatar !== false);
  const [avatar, setAvatar] = useState(userData?.publicProfile?.avatar || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [socials, setSocials] = useState<Record<string, string>>(() => {
    const current: Record<string, string> = { ...(userData?.publicProfile?.socials ?? {}) };
    if (userData?.publicProfile?.linkedin && !current.linkedin) current.linkedin = userData.publicProfile.linkedin;
    return current;
  });
  const [saving, setSaving] = useState(false);
  const isStudentAccount = userData?.isQassimStudent === true;
  const t = (ar: string, en: string) => (isAr ? ar : en);

  const pickAvatar = (file: File | undefined) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 3 * 1024 * 1024) {
      showToast(t('اختر صورة JPG أو PNG أو WebP أصغر من 3 ميغابايت.', 'Choose a JPG, PNG, or WebP image under 3 MB.'), 'error');
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setShowAvatar(true);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    for (const [key, value] of Object.entries(socials)) {
      if (value.trim() && !/^https:\/\//i.test(value.trim())) {
        showToast(t(`رابط ${SOCIALS.find(item => item.key === key)?.labelAr ?? key} يجب أن يبدأ بـ https://`, `The ${SOCIALS.find(item => item.key === key)?.labelEn ?? key} link must start with https://`), 'error');
        return;
      }
    }
    setSaving(true);
    try {
      // 1) Names and academic data go through the profile endpoint that validates them.
      const namesChanged = name.first !== initialName.first || name.father !== initialName.father || name.family !== initialName.family
        || englishName.trim() !== (userData?.englishFullName || '');
      const academicChanged = isStudentAccount && (academic.college !== (userData?.college || '') || academic.major !== (userData?.major || '')
        || academic.academicLevel !== (userData?.academicLevel || '') || academic.universityId !== (userData?.universityId || ''));
      if (namesChanged || academicChanged) {
        await httpsCallable(null, 'saveProfile')({
          firstName: name.first.trim(), fatherName: name.father.trim(), familyName: name.family.trim(),
          ...(englishName.trim() ? { englishName: englishName.trim() } : {}),
          ...(isStudentAccount ? {
            college: academic.college.trim(), major: academic.major.trim(), academicLevel: academic.academicLevel.trim(),
            universityId: normalizeStudentId(academic.universityId), isQassimStudent: true,
          } : {}),
        });
      }
      // 2) Photo.
      let avatarUrl = avatar;
      if (avatarFile) avatarUrl = await uploadImage(avatarFile, 'avatar', avatar || undefined);
      // 3) Titles, bio, photo visibility and social accounts.
      const cleanSocials = Object.fromEntries(SOCIALS.map(item => [item.key, (socials[item.key] || '').trim()]));
      await patchMe({
        titleAr: titleAr.trim(), titleEn: titleEn.trim(),
        publicProfile: { bio: bio.trim(), avatar: avatarUrl, showAvatar, linkedin: cleanSocials.linkedin, socials: cleanSocials },
      });
      showToast(t('تم حفظ ملفك الشخصي.', 'Your profile was saved.'), 'success');
      onSaved();
      onClose();
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('تعذر حفظ التغييرات.', 'Could not save your changes.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const shownPhoto = avatarPreview || avatar || userData?.photoURL || '';

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <form onSubmit={save} onClick={event => event.stopPropagation()}
            className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-[var(--color-surface)] shadow-2xl sm:rounded-3xl"
            role="dialog" aria-modal="true" aria-label={t('تعديل الملف الشخصي', 'Edit profile')}>
        <header className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <h2 className="font-cairo text-lg font-black text-[var(--color-text-primary)]">{t('تعديل الملف الشخصي', 'Edit profile')}</h2>
          <button type="button" onClick={onClose} aria-label={t('إغلاق', 'Close')} className="rounded-full p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)]"><X className="h-5 w-5" /></button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <Section title={t('الصورة', 'Photo')} hint={t('أضف صورة أو بدّلها، وتحكّم في ظهورها للآخرين (صفحة الهيكلة واللوحة).', 'Add or replace your photo and choose whether others can see it (Structure page, leaderboard).')}>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                {shownPhoto
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={shownPhoto} alt="" className={`h-full w-full object-cover ${showAvatar ? '' : 'opacity-40 grayscale'}`} referrerPolicy="no-referrer" />
                  : <Camera className="h-6 w-6 text-[var(--color-text-muted)]" />}
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => fileInput.current?.click()} className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 py-2 text-xs font-bold text-white">
                  <Camera className="h-4 w-4" />{shownPhoto ? t('تغيير الصورة', 'Change photo') : t('إضافة صورة', 'Add photo')}
                </button>
                {(avatar || avatarPreview) && (
                  <button type="button" onClick={() => { setAvatar(''); setAvatarFile(null); setAvatarPreview(null); }}
                          className="inline-flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2 text-xs font-bold text-red-700">
                    <Trash2 className="h-4 w-4" />{t('حذف الصورة', 'Remove photo')}
                  </button>
                )}
                <button type="button" onClick={() => setShowAvatar(value => !value)} aria-pressed={showAvatar}
                        className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold ${showAvatar ? 'bg-emerald-50 text-emerald-700' : 'bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]'}`}>
                  {showAvatar ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  {showAvatar ? t('الصورة ظاهرة', 'Photo visible') : t('الصورة مخفية', 'Photo hidden')}
                </button>
              </div>
              <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={event => pickAvatar(event.target.files?.[0])} />
            </div>
          </Section>

          <Section title={t('الاسم واللقب', 'Name & title')} hint={t('الاسم الكامل بالعربية والإنجليزية مطلوب لحسابات الإدارة.', 'Full name in both Arabic and English is required for staff accounts.')}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Label text={t('الاسم الأول', 'First name (Arabic)')}><input className={field} value={name.first} onChange={e => setName({ ...name, first: e.target.value })} required /></Label>
              <Label text={t('اسم الأب', 'Father name (Arabic)')}><input className={field} value={name.father} onChange={e => setName({ ...name, father: e.target.value })} required /></Label>
              <Label text={t('اسم العائلة', 'Family name (Arabic)')}><input className={field} value={name.family} onChange={e => setName({ ...name, family: e.target.value })} required /></Label>
            </div>
            <Label text={t('الاسم الكامل بالإنجليزية', 'Full name in English')}>
              <input dir="ltr" className={field} value={englishName} onChange={e => setEnglishName(e.target.value)} placeholder="Ahmed Mohammed Al-Otaibi" />
            </Label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Label text={t('المسمى بالعربية', 'Title (Arabic)')}><input className={field} value={titleAr} maxLength={100} onChange={e => setTitleAr(e.target.value)} placeholder="قائد لجنة الفعاليات" /></Label>
              <Label text={t('المسمى بالإنجليزية', 'Title (English)')}><input dir="ltr" className={field} value={titleEn} maxLength={100} onChange={e => setTitleEn(e.target.value)} placeholder="Events Team Leader" /></Label>
            </div>
          </Section>

          {isStudentAccount && (
            <Section title={t('البيانات الأكاديمية', 'Academic details')}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Label text={t('الكلية', 'College')}><input className={field} value={academic.college} onChange={e => setAcademic({ ...academic, college: e.target.value })} /></Label>
                <Label text={t('التخصص', 'Major')}><input className={field} value={academic.major} onChange={e => setAcademic({ ...academic, major: e.target.value })} /></Label>
                <Label text={t('المستوى', 'Level')}><input className={field} value={academic.academicLevel} onChange={e => setAcademic({ ...academic, academicLevel: e.target.value })} /></Label>
                <Label text={t('الرقم الجامعي', 'University ID')}><input dir="ltr" inputMode="numeric" className={field} value={academic.universityId} onChange={e => setAcademic({ ...academic, universityId: e.target.value })} /></Label>
              </div>
            </Section>
          )}

          <Section title={t('نبذة', 'About you')}>
            <textarea className={`${field} min-h-24`} maxLength={2000} value={bio} onChange={e => setBio(e.target.value)} placeholder={t('اكتب نبذة قصيرة عنك…', 'Write a short bio…')} />
          </Section>

          <Section title={t('حساباتك في وسائل التواصل', 'Social accounts')} hint={t('روابط https فقط. اترك الحقل فارغًا لإخفاء الحساب.', 'https links only. Leave a field empty to hide that account.')}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {SOCIALS.map(({ key, labelAr, labelEn, placeholder, Icon }) => (
                <Label key={key} text={isAr ? labelAr : labelEn}>
                  <div className="relative">
                    <Icon aria-hidden="true" className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
                    <input dir="ltr" type="url" className={`${field} ps-9`} value={socials[key as SocialKey] || ''} placeholder={placeholder}
                           onChange={e => setSocials({ ...socials, [key]: e.target.value })} />
                  </div>
                </Label>
              ))}
            </div>
          </Section>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-3" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
          <button type="button" onClick={onClose} className="rounded-xl bg-[var(--color-surface-2)] px-5 py-2.5 text-sm font-bold text-[var(--color-text-secondary)]">{t('إلغاء', 'Cancel')}</button>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-6 py-2.5 text-sm font-bold text-white disabled:opacity-60">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}{t('حفظ', 'Save')}
          </button>
        </footer>
      </form>
    </div>
  );
}
