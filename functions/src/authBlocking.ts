import { beforeUserCreated, beforeUserSignedIn } from 'firebase-functions/v2/identity';
import * as functions from 'firebase-functions';

// To use these functions, Firebase Authentication with Identity Platform must be upgraded in the project.

const ALLOWED_DOMAIN = process.env.ALLOWED_DOMAIN || functions.config().auth?.allowed_domain;

export const beforeCreate = beforeUserCreated((event) => {
  if (ALLOWED_DOMAIN) {
    const user = event.data;
    const emailDomain = user.email?.split('@')[1];

    if (emailDomain !== ALLOWED_DOMAIN) {
      throw new functions.https.HttpsError(
        'permission-denied', 
        `Only users from ${ALLOWED_DOMAIN} are allowed to register.`
      );
    }
  }
});

export const beforeSignIn = beforeUserSignedIn((event) => {
  if (ALLOWED_DOMAIN) {
    const user = event.data;
    const emailDomain = user.email?.split('@')[1];

    if (emailDomain !== ALLOWED_DOMAIN) {
      throw new functions.https.HttpsError(
        'permission-denied', 
        `Only users from ${ALLOWED_DOMAIN} are allowed to sign in.`
      );
    }
  }
});
