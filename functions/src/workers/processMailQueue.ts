import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { Resend } from 'resend';
import { getEmailHtml } from '../utils/emailTemplates';
import { EmailTemplate } from '../utils/email';

function getSubject(template: EmailTemplate): string {
  switch (template) {
    case 'REGISTRATION_RECEIVED': return 'Registration Received - IEEE QU';
    case 'REGISTRATION_APPROVED': return 'Registration Approved - IEEE QU';
    case 'REGISTRATION_WAITLISTED': return 'Added to Waitlist - IEEE QU';
    case 'REGISTRATION_REJECTED': return 'Registration Update - IEEE QU';
    case 'REGISTRATION_CANCELLED': return 'Registration Cancelled - IEEE QU';
    case 'ATTENDANCE_CONFIRMATION': return 'Attendance Confirmed - IEEE QU';
    case 'CERTIFICATE_AVAILABLE': return 'Certificate Available - IEEE QU';
    case 'CERTIFICATE_REVOKED': return 'Certificate Revoked - IEEE QU';
    case 'EVENT_REMINDER': return 'Upcoming Event Reminder - IEEE QU';
    default: return 'IEEE QU Notification';
  }
}

function calculateNextAttempt(attemptCount: number): Date {
  const delays = [1, 5, 15, 60, 360]; // minutes: 1m, 5m, 15m, 1h, 6h
  const delayMinutes = delays[Math.min(attemptCount, delays.length - 1)];
  const next = new Date();
  next.setMinutes(next.getMinutes() + delayMinutes);
  return next;
}

export const processMailQueue = onDocumentWritten({
  document: 'mail/{mailId}',
  secrets: ['RESEND_API_KEY']
}, async (event) => {
  const after = event.data?.after;
  if (!after || !after.exists) return; // Document deleted

  const data = after.data();
  if (data?.status !== 'PENDING') return; // Only process PENDING emails

  // If there's a scheduled next attempt in the future, do not process yet
  if (data.nextAttemptAt && data.nextAttemptAt.toDate() > new Date()) {
    return;
  }

  const db = getFirestore();
  const mailRef = after.ref;

  // Use a transaction to grab the email safely and avoid duplicate execution
  const grabbed = await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(mailRef);
    if (!doc.exists) return false;
    if (doc.data()?.status !== 'PENDING') return false;
    
    transaction.update(mailRef, { 
      status: 'PROCESSING', 
      updatedAt: FieldValue.serverTimestamp() 
    });
    return true;
  });

  if (!grabbed) {
    console.log(`Skipped mail ${mailRef.id} - already processing or not pending.`);
    return;
  }

  try {
    const html = getEmailHtml(data.template as EmailTemplate, data.data || {});
    const subject = getSubject(data.template as EmailTemplate);

    let response;
    
    // Mock for emulators
    if (process.env.FUNCTIONS_EMULATOR === 'true') {
      console.log(`[EMULATOR] Sending mocked email to ${data.to} with subject "${subject}"`);
      
      // Simulate failure if data contains a specific flag
      if (data.data?.simulateFailure) {
        throw new Error('Simulated email delivery failure');
      }
      
      response = { data: { id: 'mock_id' }, error: null };
    } else {
      // Call Resend API
      if (!process.env.RESEND_API_KEY || !process.env.SENDER_EMAIL) throw new Error('Email credentials and sender must be configured.');
      const resend = new Resend(process.env.RESEND_API_KEY);
      response = await resend.emails.send({
        from: process.env.SENDER_EMAIL,
        to: data.to,
        subject: subject,
        html: html,
      }, { idempotencyKey: mailRef.id });
    }

    if (response.error) {
      throw new Error(response.error.message);
    }

    // Success
    await mailRef.update({
      status: 'DELIVERED',
      deliveredAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      lastError: FieldValue.delete()
    });
    console.log(`Successfully sent mail ${mailRef.id}`);

  } catch (error: any) {
    console.error(`Failed to send mail ${mailRef.id}:`, error);
    
    const attemptCount = (data.attemptCount || 0) + 1;
    const errorMessage = error.message || String(error);

    if (attemptCount >= 5) {
      // Max retries reached
      await mailRef.update({
        status: 'FAILED',
        lastError: errorMessage,
        attemptCount,
        lastAttemptAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });
      console.log(`Mail ${mailRef.id} marked as FAILED after ${attemptCount} attempts.`);
    } else {
      // Schedule retry
      const nextAttemptAt = calculateNextAttempt(attemptCount);
      await mailRef.update({
        status: 'PENDING',
        lastError: errorMessage,
        attemptCount,
        lastAttemptAt: FieldValue.serverTimestamp(),
        nextAttemptAt: Timestamp.fromDate(nextAttemptAt),
        updatedAt: FieldValue.serverTimestamp()
      });
      console.log(`Mail ${mailRef.id} scheduled for retry ${attemptCount} at ${nextAttemptAt.toISOString()}`);
    }
  }
});
