import { beforeUserCreated, beforeUserSignedIn } from 'firebase-functions/v2/identity';

// To use these functions, Firebase Authentication with Identity Platform must be upgraded in the project.

export const beforeCreate = beforeUserCreated((_event) => {
  // Allow all users to register regardless of domain
  return;
});

export const beforeSignIn = beforeUserSignedIn((_event) => {
  // Allow all users to sign in regardless of domain
  return;
});

