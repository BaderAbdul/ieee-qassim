'use client';

import { readBackendResponse } from './backendResponse';
import { retryAttendanceRequest } from './retryAttendanceRequest';
import { API_BASE_URL } from './apiBase';

export { API_BASE_URL };

async function clerkToken(): Promise<string> {
  const token = await window.Clerk?.session?.getToken();
  if (!token) throw new Error('Sign in first. / سجّل دخولك أولًا.');
  return token;
}

// Compatible return shape with the old callable client; now talks to the FastAPI backend.
export function httpsCallable<Input = unknown, Output = unknown>(_unused: unknown, action: string) {
  return async (data?: Input): Promise<{ data: Output }> => {
    const token = await clerkToken();
    const attendanceAction = ['submitCheckIn', 'submitEventFeedback', 'initiatePendingCheckIn'].includes(action);
    const send = async () => {
      const response = await fetch(`${API_BASE_URL}/api/platform/${encodeURIComponent(action)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data ?? {}),
        signal: AbortSignal.timeout(attendanceAction ? 15000 : ['renderCertificate', 'issueCertificates'].includes(action) ? 165000 : action === 'processNotifications' ? 65000 : 45000),
      });
      const result = await readBackendResponse(response);
      if (!('data' in result)) throw new Error('Invalid server response. / رد الخادم غير صالح.');
      return { data: result.data as Output };
    };
    return attendanceAction ? retryAttendanceRequest(send) : send();
  };
}

export async function apiGet<Output = unknown>(path: string, params?: Record<string, string | undefined>): Promise<Output> {
  const token = path.startsWith('/api/public/') ? null : await window.Clerk?.session?.getToken().catch(() => null);
  const url = new URL(`${API_BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params ?? {})) if (value !== undefined) url.searchParams.set(key, value);
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    signal: AbortSignal.timeout(20000),
  });
  const result = await readBackendResponse(response, true, true);
  return result as Output;
}

import { compressImage } from './imageCompressor';

export async function uploadImage(file: File, purpose: 'avatar' | 'event', previousUrl?: string | null) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Use JPG, PNG or WebP images.');
  }

  // Automatically compress and resize client-side before uploading
  // Avatars are downscaled to 800x800, Event posters/covers up to 1920x1920 WebP
  const compressedFile = await compressImage(file, {
    maxWidth: purpose === 'avatar' ? 800 : 1920,
    maxHeight: purpose === 'avatar' ? 800 : 1920,
    quality: purpose === 'avatar' ? 0.82 : 0.85,
    mimeType: 'image/webp'
  });

  if (compressedFile.size > 3 * 1024 * 1024) {
    throw new Error('Choose an image under 3 MB. / اختر صورة بحجم أقل من 3 ميجابايت.');
  }

  const token = await clerkToken();
  const form = new FormData();
  form.append('file', compressedFile);
  form.append('purpose', purpose);
  if (previousUrl) form.append('previousUrl', previousUrl);
  const response = await fetch(`${API_BASE_URL}/api/media`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
    signal: AbortSignal.timeout(55000)
  });
  const result = await readBackendResponse(response);
  if (typeof result.url !== 'string' || !result.url.startsWith('https://')) throw new Error('Invalid upload response. / رد رفع الصورة غير صالح.');
  return result.url;
}


