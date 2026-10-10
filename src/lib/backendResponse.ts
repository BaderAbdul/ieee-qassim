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
