import * as admin from 'firebase-admin';

// Initialize the Firebase Admin SDK
admin.initializeApp();

// Export the Cloud Functions
export * from './registerForEvent';
export * from './generateCheckInToken';
export * from './processCheckIn';
export * from './manualAttendanceOverride';
export * from './authBlocking';
