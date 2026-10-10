import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { ApiError, statusFor } from './errors';

export async function authenticate(request: Request) {
  const origin = request.headers.get('origin');
  const requestURL = new URL(request.url);
  if (origin && origin !== requestURL.origin) {
    let localDemoAlias = false;
    try {
      const originURL = new URL(origin);
      const loopback = ['127.0.0.1', 'localhost'];
      localDemoAlias = process.env.NODE_ENV === 'development' && !!process.env.FIRESTORE_EMULATOR_HOST
        && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.startsWith('demo-') === true
        && originURL.protocol === 'http:' && requestURL.protocol === 'http:'
        && loopback.includes(originURL.hostname) && loopback.includes(requestURL.hostname)
        && originURL.port === requestURL.port;
    } catch { /* Reject malformed and non-local origins. */ }
    if (!localDemoAlias) {
      if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.startsWith('demo-')) {
        let supplied = 'invalid';
        try { supplied = new URL(origin).origin; } catch { /* no untrusted header dump */ }
        console.warn('Local origin validation failed', { supplied, expected: requestURL.origin });
      }
      throw new ApiError('permission-denied', 'Invalid origin.');
    }
  }
  const token = request.headers.get('authorization')?.match(/^Bearer (\S+)$/)?.[1];
  if (!token) throw new ApiError('unauthenticated', 'Sign in first.');
  // Load credentials only at request time. Missing configuration fails closed.
  try { await import('../firebase/admin'); }
  catch { throw new ApiError('unavailable', 'Server configuration is unavailable.'); }
  let uid: string;
  try { uid = (await getAuth().verifyIdToken(token, true)).uid; }
  catch { throw new ApiError('unauthenticated', 'Invalid or expired sign-in.'); }
  const profile = await getFirestore().collection('users').doc(uid).get();
  if (!profile.exists || profile.data()?.isRestricted) throw new ApiError('permission-denied', 'Account is unavailable.');
  return { uid, role: profile.data()?.role as string };
}

export function requireAdmin(actor: { role: string }) {
  if (!['event_organizer', 'super_admin'].includes(actor.role)) throw new ApiError('permission-denied', 'Organizer access required.');
}

export async function limitRequests(uid: string, bucket = 'platform', maximum = 60) {
  const now = Date.now();
  const ref = getFirestore().collection('api_limits').doc(`${bucket}_${uid}`);
  await getFirestore().runTransaction(async tx => {
    const data = (await tx.get(ref)).data();
    const recent = data && data.startedAt > now - 60000;
    const count = recent ? data.count + 1 : 1;
    if (count > maximum) throw new ApiError('resource-exhausted', 'Too many requests. Please wait a minute.');
    tx.set(ref, { count, startedAt: recent ? data.startedAt : now });
  });
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get('content-type')?.includes('application/json')) throw new ApiError('invalid-argument', 'JSON required.');
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError('invalid-argument', 'Missing body.');
  let size = 0; const chunks: Uint8Array[] = [];
  while (true) {
    const part = await reader.read(); if (part.done) break;
    size += part.value.byteLength;
    if (size > 65536) { await reader.cancel(); throw new ApiError('invalid-argument', 'Request is too large.'); }
    chunks.push(part.value);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString());
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value;
  } catch { throw new ApiError('invalid-argument', 'Invalid JSON.'); }
}

export function errorResponse(error: unknown) {
  const known = error instanceof ApiError;
  return Response.json({ error: { code: known ? error.code : 'internal', message: known ? error.message : 'Operation failed. Please retry.' } }, {
    status: known ? statusFor(error.code) : 500, headers: { 'Cache-Control': 'no-store' },
  });
}
