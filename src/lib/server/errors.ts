export class ApiError extends Error {
  constructor(public code: string, message: string) { super(message); }
}

export const statusFor = (code: string) => ({
  'invalid-argument': 400, unauthenticated: 401, 'permission-denied': 403,
  'not-found': 404, 'already-exists': 409, 'failed-precondition': 409,
  'resource-exhausted': 429, unavailable: 503,
}[code] || 500);
