import { FieldValue, getFirestore, Timestamp, type Transaction } from 'firebase-admin/firestore';
import { createHash, randomUUID } from 'node:crypto';

export function queueNotification(tx: Transaction, key: string, email: unknown, message: string, eventTitle: unknown) {
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
  const id = createHash('sha256').update(key).digest('hex');
  // Separate collection deliberately excludes legacy Firebase mail jobs.
  tx.create(getFirestore().collection('notification_jobs').doc(id), {
    to: email, subject: 'IEEE Qassim — تحديث حسابك / Account update',
    text: `${message}\n\n${String(eventTitle || '')}\n\nIEEE Qassim University Student Branch`,
    status: 'PENDING', attempts: 0, createdAt: FieldValue.serverTimestamp(), nextAttemptAt: Timestamp.now(),
  });
}

export interface MailPayload { to: string; subject: string; text: string }
export type MailSender = (payload: MailPayload, id: string) => Promise<void>;

const sendMail: MailSender = async (payload, id) => {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST', signal: AbortSignal.timeout(15000),
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': id },
    body: JSON.stringify({ from: process.env.SENDER_EMAIL, ...payload }),
  });
  if (!response.ok) throw new Error('Mail provider rejected delivery.');
};

export async function processNotification(id: string, sender: MailSender = sendMail) {
  const db = getFirestore(); const ref = db.collection('notification_jobs').doc(id);
  const lease = randomUUID(); const now = Date.now();
  const job = await db.runTransaction(async tx => {
    const data = (await tx.get(ref)).data();
    if (!data || !['PENDING', 'PROCESSING'].includes(data.status)) return null;
    if (data.status === 'PENDING' && data.nextAttemptAt?.toMillis() > now) return null;
    if (data.status === 'PROCESSING' && data.leaseExpiresAt > now) return null;
    // Resend deduplicates for 24h only. Do not automatically retry an uncertain older send.
    if (data.firstAttemptAt && now - data.firstAttemptAt.toMillis() >= 23 * 3600000) {
      tx.update(ref, { status: 'REVIEW', lastError: 'Delivery outcome requires manual review.' }); return null;
    }
    tx.update(ref, { status: 'PROCESSING', lease, leaseExpiresAt: now + 60000, firstAttemptAt: data.firstAttemptAt || Timestamp.now() });
    return data;
  });
  if (!job) return false;
  let delivered = false;
  try { await sender({ to: job.to, subject: job.subject, text: job.text }, id); delivered = true; }
  catch { /* Store a safe retryable error below, not provider secrets or request data. */ }
  await db.runTransaction(async tx => {
    const current = (await tx.get(ref)).data();
    if (current?.lease !== lease || current.status !== 'PROCESSING') return;
    const attempts = (current.attempts || 0) + 1;
    tx.update(ref, {
      status: delivered ? 'DELIVERED' : attempts >= 5 ? 'FAILED' : 'PENDING', attempts,
      ...(delivered ? { deliveredAt: Timestamp.now(), lastError: FieldValue.delete() } : { lastError: 'Mail delivery failed.', nextAttemptAt: Timestamp.fromMillis(Date.now() + [60000, 300000, 900000, 3600000][Math.min(attempts - 1, 3)]) }),
      updatedAt: Timestamp.now(), lease: FieldValue.delete(), leaseExpiresAt: FieldValue.delete(),
    });
  });
  return delivered;
}

export async function processNotificationBatch() {
  if (process.env.EMAIL_NOTIFICATIONS_ENABLED !== 'true' || !process.env.RESEND_API_KEY || !process.env.SENDER_EMAIL) return { enabled: false, delivered: 0 };
  const db = getFirestore();
  const [pending, abandoned] = await Promise.all([
    db.collection('notification_jobs').where('status', '==', 'PENDING').limit(20).get(),
    db.collection('notification_jobs').where('status', '==', 'PROCESSING').limit(10).get(),
  ]);
  const due = [...pending.docs, ...abandoned.docs].filter(doc => {
    const data = doc.data();
    return data.status === 'PROCESSING' ? data.leaseExpiresAt <= Date.now() : data.nextAttemptAt?.toMillis() <= Date.now();
  }).slice(0, 3);
  let delivered = 0;
  for (const doc of due) if (await processNotification(doc.id)) delivered++;
  return { enabled: true, delivered };
}
