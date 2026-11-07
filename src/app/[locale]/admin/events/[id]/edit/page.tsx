'use client';

import { use, useEffect } from 'react';
import { useRouter } from '@/i18n/routing';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// Editing an event reuses the exact same multi-stage wizard as creating one (it already supports
// resuming an existing draft via ?eventId=) instead of a separate, now-removed single-form editor.
export default function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  useEffect(() => {
    router.replace(`/admin/events/create?eventId=${id}`);
  }, [id, router]);

  return <div className="py-20 flex justify-center"><LoadingSpinner /></div>;
}
