import { ApiError, statusFor } from '@/lib/server/errors';
import { createBypassCookieValue, MAINTENANCE_BYPASS_COOKIE, MAINTENANCE_BYPASS_SECONDS } from '@/lib/server/maintenance';

export const runtime = 'nodejs';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.ieeequ.online';
const ADMIN_ROLES = new Set(['event_organizer', 'super_admin']);

function errorResponse(error: unknown) {
  const known = error instanceof ApiError;
  return Response.json({ error: { code: known ? error.code : 'internal', message: known ? error.message : 'Operation failed. Please retry.' } }, {
    status: known ? statusFor(error.code) : 500, headers: { 'Cache-Control': 'no-store' },
  });
}

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get('authorization');
    if (!authorization) throw new ApiError('unauthenticated', 'Sign in first.');
    // Reuses the backend's own Clerk verification + role lookup rather than duplicating it here.
    const me = await fetch(`${API_BASE_URL}/api/me`, { headers: { authorization } });
    if (!me.ok) throw new ApiError('unauthenticated', 'Invalid or expired sign-in.');
    const profile = await me.json();
    const uid = typeof profile.id === 'string' ? profile.id : null;
    if (!uid || !ADMIN_ROLES.has(profile.role)) throw new ApiError('permission-denied', 'Organizer access required.');
    const secret = process.env.MAINTENANCE_BYPASS_SECRET;
    if (!secret) throw new ApiError('unavailable', 'Maintenance bypass is not configured.');
    const value = createBypassCookieValue(uid, secret);
    const response = Response.json({ status: 'success' }, { headers: { 'Cache-Control': 'no-store' } });
    const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
    response.headers.append('Set-Cookie', `${MAINTENANCE_BYPASS_COOKIE}=${value}; Path=/; Max-Age=${MAINTENANCE_BYPASS_SECONDS}; HttpOnly; SameSite=Lax${secure}`);
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
