'use client';

import { auth } from './firebase/client';
import { readBackendResponse } from './backendResponse';

// Compatible return shape with the old callable clients, but same-origin Vercel transport.
export function httpsCallable<Input = unknown, Output = unknown>(_unused: unknown, action: string) {
  return async (data?: Input): Promise<{ data: Output }> => {
    const user = auth.currentUser;
    if (!user) throw new Error('Sign in first. / سجّل دخولك أولًا.');
    const response = await fetch(`/api/platform/${encodeURIComponent(action)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` },
      body: JSON.stringify(data ?? {}),
      signal: AbortSignal.timeout(['renderCertificate', 'issueCertificates'].includes(action) ? 165000 : action === 'processNotifications' ? 65000 : 45000),
    });
    const result = await readBackendResponse(response);
    if (!('data' in result)) throw new Error('Invalid server response. / رد الخادم غير صالح.');
    return { data: result.data as Output };
  };
}

export async function uploadImage(file: File, purpose: 'avatar' | 'event') {
  if (!auth.currentUser) throw new Error('Sign in first.');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 3 * 1024 * 1024) throw new Error('Use JPG, PNG or WebP under 3 MB.');
  const form = new FormData();
  form.append('file', file); form.append('purpose', purpose);
  const response = await fetch('/api/media', { method: 'POST', headers: { Authorization: `Bearer ${await auth.currentUser.getIdToken()}` }, body: form, signal: AbortSignal.timeout(55000) });
  const result = await readBackendResponse(response);
  if (typeof result.url !== 'string' || !result.url.startsWith('https://')) throw new Error('Invalid upload response. / رد رفع الصورة غير صالح.');
  return result.url;
}
