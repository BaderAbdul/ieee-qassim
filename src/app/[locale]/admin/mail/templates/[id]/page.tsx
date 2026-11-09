'use client';

import { use } from 'react';
import EmailTemplateFullPage from '@/components/admin/email/EmailTemplateFullPage';

export default function EmailTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <EmailTemplateFullPage templateId={id} />;
}
