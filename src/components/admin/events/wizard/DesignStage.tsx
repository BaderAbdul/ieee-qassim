'use client';

import { publicOrigin } from '@/lib/siteUrls';
import { useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import Image from 'next/image';
import { ImagePlus, Link2, Save } from 'lucide-react';
import { uploadImage } from '@/lib/backend';
import { useToast } from '@/context/ToastContext';
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

// The poster must be a genuine WebP file -- a non-WebP source is rejected with a toast pointing
// at the matching CloudConvert conversion page, rather than silently re-encoded server-side.
const WEBP_HINT_SLUG: Record<string, string> = { 'image/png': 'png-to-webp', 'image/jpeg': 'jpg-to-webp' };

export default function DesignStage({ isAr, eventId, value, onChange, onSave, saving }: DesignStageProps) {
  const locale = useLocale();
  const { showToast } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'image/webp') {
      const slug = WEBP_HINT_SLUG[file.type] || 'image-converter';
      showToast(isAr
        ? `صورة الإعلان يجب أن تكون بصيغة WebP. حوّلها أولًا عبر cloudconvert.com/${slug} ثم ارفعها.`
        : `The poster image must be a WebP file. Convert it first at cloudconvert.com/${slug}, then upload it.`, 'error');
      if (fileInput.current) fileInput.current.value = '';
      return;
    }
    setUploading(true);
    try {
      const url = await uploadImage(file, 'event', value.coverUrl || undefined);
      onChange({ coverUrl: url });
    } catch (error) {
      showToast(error instanceof Error ? error.message : (isAr ? 'تعذر رفع الصورة.' : 'Could not upload the image.'), 'error');
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const save = async () => onSave({ coverUrl: value.coverUrl });
  const eventUrl = typeof window !== 'undefined' ? `${publicOrigin()}/${locale}/events/${eventId}` : '';

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
