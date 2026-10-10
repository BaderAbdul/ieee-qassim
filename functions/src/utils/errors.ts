import * as functions from 'firebase-functions/v1';

export const throwUnauthenticated = (message = 'The function must be called while authenticated.') => {
  throw new functions.https.HttpsError('unauthenticated', message);
};

export const throwUnauthorized = (message = 'You do not have permission to perform this action.') => {
  throw new functions.https.HttpsError('permission-denied', message);
};

export const throwNotFound = (message = 'The requested resource was not found.') => {
  throw new functions.https.HttpsError('not-found', message);
};

export const throwFailedPrecondition = (message = 'Failed precondition.') => {
  throw new functions.https.HttpsError('failed-precondition', message);
};
