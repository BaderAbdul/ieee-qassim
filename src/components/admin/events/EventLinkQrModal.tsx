'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Check, Copy, X } from 'lucide-react';

const subscribeNever = () => () => {};

interface EventLinkQrModalProps {
  url: string;
  isAr: boolean;
  onClose: () => void;
}

export default function EventLinkQrModal({ url, isAr, onClose }: EventLinkQrModalProps) {
  const [copied, setCopied] = useState(false);
  // EventCard (this modal's parent) uses backdrop-blur, which makes it a containing block for
  // fixed-position descendants -- without a portal, this modal would be trapped inside the card
  // instead of covering the page (see ConfirmDialog.tsx for the same issue/fix).
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);

  useEffect(() => {
    navigator.clipboard?.writeText(url).then(() => setCopied(true)).catch(() => {});
  }, [url]);

  const copyAgain = () => {
    navigator.clipboard?.writeText(url).then(() => setCopied(true)).catch(() => {});
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center w-full mb-4">
          <h2 className="text-lg font-bold font-cairo">{isAr ? 'رابط الفعالية' : 'Event link'}</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="bg-white p-3 rounded-xl border border-gray-200">
          <QRCodeSVG value={url} size={200} />
        </div>

        <div className="w-full mt-4 flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={url}
            dir="ltr"
            onFocus={(e) => e.target.select()}
            className="flex-1 min-w-0 text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-2 text-gray-700"
          />
          <button
            type="button"
            onClick={copyAgain}
            className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold flex items-center gap-1 transition-colors ${
              copied ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {isAr ? (copied ? 'تم النسخ' : 'نسخ') : (copied ? 'Copied' : 'Copy')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
