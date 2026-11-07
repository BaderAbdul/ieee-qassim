'use client';

import { useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import Image from 'next/image';
import { ImagePlus, Link2, Save } from 'lucide-react';
import { uploadImage } from '@/lib/backend';
import EventLinkQrModal from '../EventLinkQrModal';
import { button, label, primaryButton, type DesignFields } from './wizardTypes';

interface DesignStageProps {
  isAr: boolean;
  eventId: number;
  value: DesignFields;
  onChange: (next: DesignFields) => void;
  onSave: (fields: Record<string, unknown>) => Promise<void>;
  saving: boolean;
}

// Not a hard requirement -- uploadImage() always re-encodes to WebP server-side -- just a nudge
// toward converting the *source* file first for better quality/size than a re-encode would give.
const WEBP_HINT_SLUG: Record<string, string> = { 'image/png': 'png-to-webp', 'image/jpeg': 'jpg-to-webp' };

export default function DesignStage({ isAr, eventId, value, onChange, onSave, saving }: DesignStageProps) {
  const locale = useLocale();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [webpHint, setWebpHint] = useState('');
  const [showQr, setShowQr] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const slug = WEBP_HINT_SLUG[file.type];
    setWebpHint(slug ? (isAr
      ? `الملف الأصلي ليس WebP -- لأفضل جودة/حجم يمكنك تحويله أولًا عبر cloudconvert.com/${slug} (اختياري، سيتم رفعه كما هو إن تجاوزت هذه الخطوة).`
      : `Source file isn't WebP yet -- for the best quality/size you can convert it first at cloudconvert.com/${slug} (optional, it'll upload fine either way).`) : '');
    setUploading(true);
    setUploadError('');
    try {
      const url = await uploadImage(file, 'event', value.coverUrl || undefined);
      onChange({ coverUrl: url });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : (isAr ? 'تعذر رفع الصورة.' : 'Could not upload the image.'));
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const save = async () => onSave({ coverUrl: value.coverUrl });
  const eventUrl = typeof window !== 'undefined' ? `${window.location.origin}/${locale}/events/${eventId}` : '';

  return (
    <div className="space-y-5">
      <div>
        <span className={label}>{isAr ? 'صورة الفعالية (الإعلان)' : 'Event poster'}</span>
        <div className="mt-2 flex flex-wrap items-start gap-4">
          {value.coverUrl && (
            <div className="h-32 w-48 overflow-hidden rounded-xl border border-[var(--color-border)]">
              <Image src={value.coverUrl} alt="" width={384} height={256} unoptimized className="h-full w-full object-cover" />
            </div>
          )}
          <div className="space-y-2">
            <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFile}
                   disabled={uploading} className="hidden" id="design-poster-input" />
            <label htmlFor="design-poster-input" className={`${button} cursor-pointer`}>
              <ImagePlus size={16} />
              {uploading ? (isAr ? 'جارٍ الرفع...' : 'Uploading...') : value.coverUrl ? (isAr ? 'تغيير الصورة' : 'Change image') : (isAr ? 'رفع صورة' : 'Upload image')}
            </label>
            {webpHint && <p className="max-w-sm text-xs text-[var(--color-text-muted)]">{webpHint}</p>}
            {uploadError && <p role="alert" className="text-xs" style={{ color: 'var(--color-danger)' }}>{uploadError}</p>}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
        <p className="text-sm text-[var(--color-text-secondary)]">
          {isAr ? 'شارك رابط صفحة الفعالية العامة أو رمز QR الخاص بها.' : 'Share the event’s public page link or its QR code.'}
        </p>
        <button type="button" onClick={() => setShowQr(true)} className={button}>
          <Link2 size={16} />{isAr ? 'الرابط ورمز QR' : 'Link & QR'}
        </button>
      </div>

      <div className="flex justify-end">
        <button type="button" disabled={saving} onClick={save} className={primaryButton}>
          <Save size={16} />{saving ? (isAr ? 'جارٍ الحفظ...' : 'Saving...') : (isAr ? 'حفظ' : 'Save')}
        </button>
      </div>

      {showQr && <EventLinkQrModal url={eventUrl} isAr={isAr} onClose={() => setShowQr(false)} />}
    </div>
  );
}
