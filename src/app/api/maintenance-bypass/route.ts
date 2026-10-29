import { authenticate, errorResponse, requireAdmin } from '@/lib/server/request';
import { ApiError } from '@/lib/server/errors';
import { createBypassCookieValue, MAINTENANCE_BYPASS_COOKIE, MAINTENANCE_BYPASS_SECONDS } from '@/lib/server/maintenance';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const actor = await authenticate(request);
    requireAdmin(actor);
    const secret = process.env.MAINTENANCE_BYPASS_SECRET;
    if (!secret) throw new ApiError('unavailable', 'Maintenance bypass is not configured.');
    const value = createBypassCookieValue(actor.uid, secret);
    const response = Response.json({ status: 'success' }, { headers: { 'Cache-Control': 'no-store' } });
    const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
    response.headers.append('Set-Cookie', `${MAINTENANCE_BYPASS_COOKIE}=${value}; Path=/; Max-Age=${MAINTENANCE_BYPASS_SECONDS}; HttpOnly; SameSite=Lax${secure}`);
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
