/**
 * Native Cryptographic Utility Engine
 * Implements HMAC-SHA256 JWT signing/verification and SHA-256 certificate hashing
 * with zero external dependencies using Node 24 native `node:crypto`.
 */

import * as crypto from 'node:crypto';

export const DEFAULT_JWT_SECRET = 'ieee-qu-e2e-super-secret-key-native-node24-2026';

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

export interface CheckInTokenPayload {
  eventId: string;
  nonce: string;
  iat: number;
  exp: number;
}

/**
 * Signs a standard JWT with HMAC-SHA256
 */
export function createCheckInToken(
  data: { eventId: string; nonce?: string; expiresInSec?: number },
  secret: string = DEFAULT_JWT_SECRET
): string {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const expiresInSec = data.expiresInSec ?? 60; // 60-second default matching platform specification

  const payload: CheckInTokenPayload = {
    eventId: data.eventId,
    nonce: data.nonce || `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`,
    iat: now,
    exp: now + expiresInSec,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(signatureInput);
  const signature = base64UrlEncode(hmac.digest('base64'));

  return `${signatureInput}.${signature}`;
}

/**
 * Verifies a JWT token with constant-time comparison and expiration check
 */
export function verifyCheckInToken(
  token: string,
  secret: string = DEFAULT_JWT_SECRET
): CheckInTokenPayload {
  if (!token || typeof token !== 'string') {
    throw new Error('Token is invalid or expired.');
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Token is invalid or expired.');
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(signatureInput);
  const expectedSignature = base64UrlEncode(hmac.digest('base64'));

  // Constant-time signature verification
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSignature);

  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    throw new Error('Token is invalid or expired.');
  }

  let payload: CheckInTokenPayload;
  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload));
  } catch {
    throw new Error('Token is invalid or expired.');
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    throw new Error('Token is invalid or expired.');
  }

  return payload;
}

/**
 * Computes deterministic SHA-256 hash for certificate verification
 */
export function hashCertificate(data: {
  certificateId: string;
  eventId: string;
  userId: string;
  issueDate: string | Date;
}): string {
  const dateStr = data.issueDate instanceof Date ? data.issueDate.toISOString() : String(data.issueDate);
  const rawString = `${data.certificateId}:${data.eventId}:${data.userId}:${dateStr}`;
  return crypto.createHash('sha256').update(rawString).digest('hex');
}
