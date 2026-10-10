import { initializeApp } from 'firebase-admin/app';

// Initialize the Firebase Admin SDK
initializeApp();

// Export the Cloud Functions
export * from './registerForEvent';
export { onUserProfileWritten } from './publicProfiles';
export * from './checkUniversityId';
export * from './generateCheckInToken';
export * from './processCheckIn';
export * from './submitCheckIn';
export * from './manualAttendanceOverride';
export * from './addManualPoints';
export * from './onPointTransactionCreated';
export * from './issueCertificates';
export * from './saveExternalCertificate';
export * from './generateCertificate';
export * from './getCertificateDownloadUrl';
export * from './retryCertificate';
export * from './revokeCertificate';

// Transactional Email System
export * from './workers/processMailQueue';
export * from './cron/retryMailQueue';
export * from './triggers/emailRegistrations';
export * from './triggers/emailAttendance';
export * from './triggers/emailCertificates';
export * from './cron/sendEventReminders';
export * from './triggers/onRegistrationCancelled';
