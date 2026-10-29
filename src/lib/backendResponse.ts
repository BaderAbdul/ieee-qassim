// Hosting/runtime failures can return an empty body or HTML instead of JSON.
// Never turn that into a misleading JSON parsing exception in the student UI.
export async function readBackendResponse(response: Response): Promise<Record<string, unknown>> {
  const message = `تعذر الاتصال بالخادم. حاول لاحقًا أو تواصل مع المنظم. / Server unavailable. Please retry or contact the organizer. (HTTP ${response.status})`;
  let result: Record<string, unknown>;
  try {
    const value = JSON.parse(await response.text());
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    result = value;
  } catch {
    throw Object.assign(new Error(message), { code: 'backend/invalid-response', status: response.status });
  }
  if (!response.ok) {
    const error = result.error && typeof result.error === 'object' ? result.error as Record<string, unknown> : {};
    throw Object.assign(new Error(typeof error.message === 'string' ? error.message : message), {
      code: typeof error.code === 'string' ? error.code : 'backend/request-failed', status: response.status,
    });
  }
  return result;
}

// A few admin.py GET endpoints return a bare JSON array (json_agg) rather than an object.
// Self-contained (doesn't import apiGet from backend.ts) to avoid touching that shared module.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.ieeequ.online';

export async function apiGetArray<T = unknown>(path: string, params?: Record<string, string | undefined>): Promise<T[]> {
  const token = await window.Clerk?.session?.getToken().catch(() => null);
  const url = new URL(`${API_BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params ?? {})) if (value !== undefined) url.searchParams.set(key, value);
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    signal: AbortSignal.timeout(20000),
  });
  const message = `تعذر الاتصال بالخادم. حاول لاحقًا أو تواصل مع المنظم. / Server unavailable. Please retry or contact the organizer. (HTTP ${response.status})`;
  let value: unknown;
  try { value = JSON.parse(await response.text()); } catch { value = undefined; }
  if (!response.ok) {
    const record = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
    const error = record.error && typeof record.error === 'object' ? record.error as Record<string, unknown> : {};
    throw Object.assign(new Error(typeof error.message === 'string' ? error.message : message), {
      code: typeof error.code === 'string' ? error.code : 'backend/request-failed', status: response.status,
    });
  }
  if (!Array.isArray(value)) throw Object.assign(new Error(message), { code: 'backend/invalid-response', status: response.status });
  return value as T[];
}
