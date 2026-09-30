import * as admin from 'firebase-admin';

// Initialize the Firebase Admin SDK
admin.initializeApp();

// Export the Cloud Functions
export * from './registerForEvent';
export * from './generateCheckInToken';
export * from './processCheckIn';
export * from './submitCheckIn';
export * from './manualAttendanceOverride';
export * from './addManualPoints';
export * from './onPointTransactionCreated';
export * from './authBlocking';
export * from './issueCertificates';
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
