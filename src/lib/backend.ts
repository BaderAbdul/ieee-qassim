'use client';

import { auth } from './firebase/client';

// Compatible return shape with the old callable clients, but same-origin Vercel transport.
export function httpsCallable<Input = unknown, Output = unknown>(_unused: unknown, action: string) {
  return async (data?: Input): Promise<{ data: Output }> => {
    const user = auth.currentUser;
    if (!user) throw new Error('Sign in first. / سجّل دخولك أولًا.');
    const response = await fetch(`/api/platform/${encodeURIComponent(action)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` },
      body: JSON.stringify(data ?? {}),
    });
    const result = await response.json();
    if (!response.ok) throw Object.assign(new Error(result.error?.message || 'Request failed.'), { code: result.error?.code });
    return { data: result.data as Output };
  };
}

export async function uploadImage(file: File, purpose: 'avatar' | 'event') {
  if (!auth.currentUser) throw new Error('Sign in first.');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 3 * 1024 * 1024) throw new Error('Use JPG, PNG or WebP under 3 MB.');
  const form = new FormData();
  form.append('file', file); form.append('purpose', purpose);
  const response = await fetch('/api/media', { method: 'POST', headers: { Authorization: `Bearer ${await auth.currentUser.getIdToken()}` }, body: form });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error?.message || 'Upload failed.');
  return result.url as string;
}
