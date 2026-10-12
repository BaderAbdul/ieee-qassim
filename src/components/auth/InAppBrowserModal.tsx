'use client';

import React, { useState } from 'react';
import { ExternalLink, Copy, Check, AlertTriangle, Compass, X } from 'lucide-react';
import { isIOS } from '@/lib/auth/inAppBrowser';

interface InAppBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function InAppBrowserModal({ isOpen, onClose }: InAppBrowserModalProps) {
  const [copied, setCopied] = useState(false);
  const ios = typeof window !== 'undefined' ? isIOS() : false;

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://ieeequ.online';

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(currentUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = currentUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleOpenExternal = () => {
    // Attempt standard window.open or custom scheme fallback
    window.open(currentUrl, '_system');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" dir="rtl">
      <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-gray-100 text-gray-900 overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="إغلاق"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Warning Icon Badge */}
        <div className="flex items-center justify-center w-14 h-14 mx-auto mb-4 bg-amber-50 rounded-2xl text-amber-600 border border-amber-200 shadow-inner">
          <AlertTriangle className="w-7 h-7" />
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-center text-gray-900 mb-2 font-serif">
          تنبيه تسجيل الدخول
        </h3>

        {/* Description */}
        <p className="text-sm text-center text-gray-600 mb-5 leading-relaxed">
          تمنع سياسات أمان <strong className="text-gray-800">Google</strong> تسجيل الدخول داخل متصفحات التطبيقات (مثل واتساب أو إنستغرام). يُرجى فتح الرابط في المتصفح الرئيسي لهاتفك للمتابعة.
        </p>

        {/* Instructions Box */}
        <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-4 mb-5 text-sm space-y-2.5 text-blue-950">
          <div className="flex items-start gap-2.5">
            <Compass className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              {ios ? (
                <>
                  <p className="font-semibold text-blue-900">لمستخدمي الآيفون (iOS):</p>
                  <p className="text-xs text-blue-800/90 mt-1">
                    اضغط على أيقونة المشاركة <span className="font-mono bg-blue-100 px-1.5 py-0.5 rounded text-blue-900">⎋</span> أو زر القائمة أسفل الشاشة، ثم اختر <strong className="text-blue-950">«فتح في Safari»</strong>.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-blue-900">لمستخدمي أندرويد:</p>
                  <p className="text-xs text-blue-800/90 mt-1">
                    اضغط على النقاط الثلاث <span className="font-mono bg-blue-100 px-1.5 py-0.5 rounded text-blue-900">⋮</span> أعلى يمين الشاشة، ثم اختر <strong className="text-blue-950">«فتح في Chrome»</strong>.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={handleCopy}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-md hover:shadow-lg transition-all"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>تم نسخ الرابط! الصقه في المتصفح</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>نسخ رابط الموقع لفتحه خارجياً</span>
              </>
            )}
          </button>

          <button
            onClick={handleOpenExternal}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            <span>محاولة الفتح في المتصفح الآن</span>
          </button>
        </div>
      </div>
    </div>
  );
}
