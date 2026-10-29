import { createHmac, timingSafeEqual } from 'node:crypto';
import { get } from '@vercel/global-config';
import { ApiError } from './errors';

export const MAINTENANCE_BYPASS_COOKIE = 'ieee_maintenance_bypass';
// Doubled so one sign-in survives a migration window that runs long, without forcing a re-login mid-cutover.
const BASE_BYPASS_SECONDS = 7 * 24 * 60 * 60;
export const MAINTENANCE_BYPASS_SECONDS = BASE_BYPASS_SECONDS * 2;

const sign = (payload: string, secret: string) => createHmac('sha256', secret).update(payload).digest('hex');

export function createBypassCookieValue(uid: string, secret: string) {
  const expiresAt = Date.now() + MAINTENANCE_BYPASS_SECONDS * 1000;
  const payload = `${Buffer.from(uid).toString('base64url')}.${expiresAt}`;
  return `${payload}.${sign(payload, secret)}`;
}

export function verifyBypassCookieValue(value: string | undefined, secret: string): boolean {
  if (!value) return false;
  const parts = value.split('.');
  if (parts.length !== 3) return false;
  const [uidPart, expiresPart, signaturePart] = parts;
  const expected = sign(`${uidPart}.${expiresPart}`, secret);
  let given: Buffer, want: Buffer;
  try { given = Buffer.from(signaturePart, 'hex'); want = Buffer.from(expected, 'hex'); } catch { return false; }
  if (given.length !== want.length || !timingSafeEqual(given, want)) return false;
  const expiresAt = Number(expiresPart);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

// Never reads the app database: the flag must stay readable even while Firestore/Postgres is down.
export async function isMaintenanceOn(): Promise<boolean> {
  if (!process.env.GLOBAL_CONFIG && !process.env.EDGE_CONFIG) return false;
  try { return (await get('maintenanceMode')) === true; }
  catch (error) { console.error('Maintenance flag read failed', error); return false; }
}

export async function setMaintenanceMode(on: boolean): Promise<void> {
  const { GLOBAL_CONFIG_ID, VERCEL_API_TOKEN, VERCEL_TEAM_ID } = process.env;
  if (!GLOBAL_CONFIG_ID || !VERCEL_API_TOKEN) throw new ApiError('unavailable', 'Maintenance mode is not configured (missing Global Config credentials).');
  const url = new URL(`https://api.vercel.com/v1/global-config/${GLOBAL_CONFIG_ID}/items`);
  if (VERCEL_TEAM_ID) url.searchParams.set('teamId', VERCEL_TEAM_ID);
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${VERCEL_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: [{ operation: 'upsert', key: 'maintenanceMode', value: on }] }),
  });
  if (!response.ok) throw new ApiError('unavailable', `Could not update maintenance mode (${response.status}).`);
}
