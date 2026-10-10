export type OperationResult = { id: string; name: string; success: boolean; message?: string };

/** Sequential processing avoids hot event-counter contention and retains partial results. */
export async function runOperations<T extends { id: string; name: string }>(items: T[], run: (item: T) => Promise<unknown>): Promise<OperationResult[]> {
  const results: OperationResult[] = [];
  for (const item of items) {
    try { await run(item); results.push({ id: item.id, name: item.name, success: true }); }
    catch (error) { results.push({ id: item.id, name: item.name, success: false, message: error instanceof Error ? error.message : 'تعذر تنفيذ العملية' }); }
  }
  return results;
}

export function registrationAction(status: string): 'approve' | 'reject' | 'cancel' | 'waitlist' {
  const actions = { approved: 'approve', rejected: 'reject', cancelled: 'cancel', waitlisted: 'waitlist' } as const;
  if (!(status in actions)) throw new Error('حالة التسجيل غير مدعومة');
  return actions[status as keyof typeof actions];
}
