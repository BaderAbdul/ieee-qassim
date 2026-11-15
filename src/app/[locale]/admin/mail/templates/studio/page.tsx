'use client';

import EmailStudio from '@/components/admin/email/EmailStudio';
import DesktopOnlyGate from '@/components/admin/DesktopOnlyGate';

export default function EmailStudioPage() {
  return <DesktopOnlyGate><EmailStudio /></DesktopOnlyGate>;
}
