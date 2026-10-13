import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ApiError } from './errors';
import { documentId } from './lifecycle';
import { privateDownload, uploadAsset } from './cloudinary';
import { queueNotification } from './notifications';
import { audit } from './audit';

export async function assignCertificate(actor: string, eventId: string, userId: string, externalUrl?: string) {
  const db = getFirestore();
  const id = `certificate_${documentId(eventId, 'eventId')}_${documentId(userId, 'userId')}`;
  const notificationKey = randomUUID();
  let url: URL | undefined;
  if (externalUrl !== undefined) {
    try { url = new URL(externalUrl); } catch { throw new ApiError('invalid-argument', 'Invalid certificate URL.'); }
    if (url.protocol !== 'https:' || url.username || url.password || url.href.length > 2000) throw new ApiError('invalid-argument', 'Use an HTTPS certificate URL.');
  }
  return db.runTransaction(async tx => {
    const ref = db.collection('certificates').doc(id);
    const [event, log, user, previous] = await Promise.all([
      tx.get(db.collection('events').doc(eventId)), tx.get(db.collection('attendance_logs').doc(`${eventId}_${userId}`)),
      tx.get(db.collection('users').doc(userId)), tx.get(ref),
    ]);
    const eventData = event.data();
    const isExternal = !!url;
    const validState = isExternal ? ['Ongoing', 'Completed'].includes(eventData?.state) : eventData?.state === 'Completed';
    if (!validState || !log.exists || !user.exists || user.data()?.isRestricted) throw new ApiError('failed-precondition', 'Completed event and verified attendance required.');
    if (!isExternal && eventData?.hasCertificate !== true) throw new ApiError('failed-precondition', 'Completed event and verified attendance required.');
    if (isExternal && eventData?.hasCertificate !== true) tx.update(db.collection('events').doc(eventId), { hasCertificate: true });
    if (['Revoked', 'Generating'].includes(previous.data()?.status)) {
      if (url) throw new ApiError('failed-precondition', 'Certificate cannot be replaced in this state.');
      return { id, queued: false };
    }
    if (!url && previous.data()?.status === 'Available') return { id, queued: false };
    tx.set(ref, {
      id, eventId, userId, status: url ? 'Available' : 'Generating',
      ...(url ? { externalUrl: url.href, issueDate: FieldValue.serverTimestamp() } : {}),
      studentName: user.data()?.arabicFullName || user.data()?.displayName || 'Student',
      eventTitle: event.data()?.title || '', eventType: event.data()?.type || 'Other',
      attendanceDate: log.data()?.timestamp || event.data()?.date,
      createdAt: previous.data()?.createdAt || FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
      issuedBy: actor, attemptCount: 0,
    });
    if (url && previous.data()?.externalUrl !== url.href) queueNotification(tx, notificationKey, user.data()?.email, 'شهادتك متاحة في ملفك الشخصي. / Your certificate is available in your profile.', event.data()?.title);
    audit(tx, url ? 'certificate.external' : 'certificate.queue', actor, id, { eventId, before: previous.data()?.status || null, after: url ? 'Available' : 'Generating' });
    return { id, queued: !url };
  });
}

export async function authorizeCertificate(id: unknown, uid: string, admin: boolean) {
  const ref = getFirestore().collection('certificates').doc(documentId(id, 'certificateId'));
  const snap = await ref.get();
  if (!snap.exists) throw new ApiError('not-found', 'Certificate not found.');
  if (snap.data()?.userId !== uid && !admin) throw new ApiError('permission-denied', 'Certificate is private.');
  return { ref, data: snap.data()! };
}

export async function certificateDownload(id: unknown, uid: string, admin: boolean) {
  const { data } = await authorizeCertificate(id, uid, admin);
  if (data.status !== 'Available') throw new ApiError('failed-precondition', 'Certificate is not available.');
  if (data.externalUrl) {
    const url = new URL(data.externalUrl);
    if (url.protocol !== 'https:' || url.username || url.password) throw new ApiError('failed-precondition', 'Invalid certificate link.');
    return { status: 'success', url: url.href };
  }
  if (!data.cloudinaryPublicId) throw new ApiError('failed-precondition', 'Legacy certificate requires migration.');
  return { status: 'success', url: privateDownload(data.cloudinaryPublicId) };
}

const escape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export async function renderCertificate(id: string) {
  const db = getFirestore(); const ref = db.collection('certificates').doc(documentId(id, 'certificateId'));
  const lease = randomUUID();
  const data: FirebaseFirestore.DocumentData | null = await db.runTransaction(async tx => {
    const snap = await tx.get(ref); const data = snap.data();
    if (!data || data.status !== 'Generating') return null;
    if (data.leaseExpiresAt > Date.now()) return null;
    const [event, attendance, user] = await Promise.all([
      tx.get(db.collection('events').doc(data.eventId)), tx.get(db.collection('attendance_logs').doc(`${data.eventId}_${data.userId}`)), tx.get(db.collection('users').doc(data.userId)),
    ]);
    if (event.data()?.state !== 'Completed' || !event.data()?.hasCertificate || !attendance.exists || !user.exists || user.data()?.isRestricted) {
      tx.update(ref, { status: 'Failed', lastError: 'Certificate eligibility changed; review attendance and account status.', updatedAt: FieldValue.serverTimestamp(), lease: FieldValue.delete(), leaseExpiresAt: FieldValue.delete() });
      return null;
    }
    tx.update(ref, { lease, leaseExpiresAt: Date.now() + 5 * 60000, updatedAt: FieldValue.serverTimestamp() });
    return { ...data, recipientEmail: user.data()?.email };
  });
  if (!data) return { processed: false };
  let browser: Awaited<ReturnType<typeof import('puppeteer-core')['default']['launch']>> | undefined;
  try {
    const [{ default: puppeteer }, { default: chromium }, regular, bold] = await Promise.all([
      // These packages are ESM-only. Preserve native import() in the server bundle
      // instead of letting Webpack turn the imports into CommonJS require().
      import(/* webpackIgnore: true */ 'puppeteer-core'), import(/* webpackIgnore: true */ '@sparticuz/chromium'),
      readFile(path.join(process.cwd(), 'functions/src/assets/fonts/Cairo-Regular.ttf')),
      readFile(path.join(process.cwd(), 'functions/src/assets/fonts/Cairo-Bold.ttf')),
    ]);
    browser = await puppeteer.launch({ args: chromium.args, executablePath: await chromium.executablePath(), headless: true });
    const page = await browser.newPage();
    // No network access is needed by certificate markup.
    await page.setRequestInterception(true);
    page.on('request', request => { if (request.url().startsWith('data:') || request.url() === 'about:blank') void request.continue(); else void request.abort(); });
    await page.setContent(`<!doctype html><html dir="rtl" lang="ar"><meta charset="utf-8"><style>
      @font-face{font-family:Cairo;src:url(data:font/ttf;base64,${regular.toString('base64')})} @font-face{font-family:Cairo;font-weight:700;src:url(data:font/ttf;base64,${bold.toString('base64')})}
      body{font-family:Cairo;margin:0;background:#f8fafc;padding:18mm;text-align:center}main{border:4mm solid #1e3a8a;padding:12mm;background:white}h1{font-size:38px;color:#1e3a8a}h2{font-size:28px}p{font-size:20px}small{font-size:11px}
      </style><main><h1>شهادة حضور</h1><p>تشهد IEEE بجامعة القصيم بأن</p><h2>${escape(data.studentName)}</h2><p>قد حضر/ت فعالية</p><h2>${escape(data.eventTitle)}</h2><small>رقم الشهادة: ${escape(id)}</small></main></html>`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.fonts.ready);
    const pdf = await page.pdf({ format: 'A4', landscape: true, printBackground: true });
    const asset = await uploadAsset(pdf, 'application/pdf', `ieee/certificates/${data.eventId}`, 'authenticated');
    await db.runTransaction(async tx => {
      const current = (await tx.get(ref)).data();
      if (current?.status !== 'Generating' || current.lease !== lease) return;
      tx.update(ref, { status: 'Available', cloudinaryPublicId: asset.publicId, issueDate: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), attemptCount: FieldValue.increment(1), lease: FieldValue.delete(), leaseExpiresAt: FieldValue.delete() });
      queueNotification(tx, `certificate_${id}_${lease}`, data.recipientEmail, 'شهادتك متاحة في ملفك الشخصي. / Your certificate is available in your profile.', data.eventTitle);
    });
    return { processed: true };
  } catch (error) {
    await db.runTransaction(async tx => {
      const current = (await tx.get(ref)).data();
      if (current?.status === 'Generating' && current.lease === lease) tx.update(ref, { status: 'Failed', lastError: 'Rendering or private media upload failed.', updatedAt: FieldValue.serverTimestamp(), lease: FieldValue.delete(), leaseExpiresAt: FieldValue.delete() });
    });
    throw error;
  } finally { await browser?.close(); }
}
