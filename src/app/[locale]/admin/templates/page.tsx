'use client';

import { useLocale } from 'next-intl';
import { Mail } from 'lucide-react';

export default function AdminTemplatesPage() {
  const isAr = useLocale() === 'ar';
  return (
    <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-12 text-center">
      <div className="w-14 h-14 bg-[var(--color-accent-soft)] text-[var(--color-accent)] rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Mail className="w-7 h-7" />
      </div>
      <h1 className="text-xl font-bold text-[var(--color-text-primary)] font-cairo">
        {isAr ? 'قوالب البريد والشهادات' : 'Email & certificate templates'}
      </h1>
      <p className="text-sm text-[var(--color-text-secondary)] mt-2 max-w-md mx-auto">
        {isAr ? 'قريبًا — هذه الصفحة محجوزة لميزة إدارة قوالب البريد والشهادات.' : "Coming soon — this page is reserved for the email & certificate templates feature."}
      </p>
    </div>
  );
}
