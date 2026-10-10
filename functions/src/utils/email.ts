import { FieldValue, getFirestore } from 'firebase-admin/firestore';

export type EmailTemplate = 
  | 'REGISTRATION_RECEIVED'
  | 'REGISTRATION_APPROVED'
  | 'REGISTRATION_WAITLISTED'
  | 'REGISTRATION_REJECTED'
  | 'REGISTRATION_CANCELLED'
  | 'ATTENDANCE_CONFIRMATION'
  | 'CERTIFICATE_AVAILABLE'
  | 'CERTIFICATE_REVOKED'
  | 'EVENT_REMINDER';

export interface EmailData {
  to: string;
  template: EmailTemplate;
  data: Record<string, unknown>;
  dedupeKey: string;
}

/**
 * Enqueues an email into the `mail` collection for asynchronous processing.
 * Uses `dedupeKey` as the document ID to guarantee idempotency.
 */
export async function enqueueEmail(payload: EmailData) {
  const db = getFirestore();
  
  const mailRef = db.collection('mail').doc(payload.dedupeKey);
  
  try {
    await mailRef.create({
      to: payload.to,
      template: payload.template,
      data: payload.data,
      status: 'PENDING',
      dedupeKey: payload.dedupeKey,
      attemptCount: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
    console.log(`Successfully enqueued email ${payload.template} with dedupeKey ${payload.dedupeKey}`);
  } catch (error: any) {
    if (error.code === 6) { // ALREADY_EXISTS
      console.log(`Email with dedupeKey ${payload.dedupeKey} already exists. Skipping.`);
    } else {
      console.error(`Failed to enqueue email with dedupeKey ${payload.dedupeKey}:`, error);
      throw error;
    }
  }
}
