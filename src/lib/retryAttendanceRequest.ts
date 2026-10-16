/** One bounded retry for idempotent attendance/feedback requests only. */
export async function retryAttendanceRequest<T>(operation: () => Promise<T>, wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))): Promise<T> {
  try { return await operation(); }
  catch (error) {
    const failure = error as { name?: string; status?: number; code?: string } | null;
    const transient = error instanceof TypeError || failure?.name === 'TimeoutError'
      || [502, 503, 504].includes(failure?.status || 0)
      || ['unavailable', 'aborted'].includes(failure?.code || '');
    if (!transient) throw error;
    await wait(400 + Math.floor(Math.random() * 400));
    return operation();
  }
}
