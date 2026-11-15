'use client';

import EmailTemplateFullPage from '@/components/admin/email/EmailTemplateFullPage';
import DesktopOnlyGate from '@/components/admin/DesktopOnlyGate';

export default function NewEmailTemplatePage() {
  return <DesktopOnlyGate><EmailTemplateFullPage /></DesktopOnlyGate>;
}
