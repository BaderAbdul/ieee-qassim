import { createHash, randomUUID } from 'node:crypto';
import { ApiError } from './errors';

export function cloudinaryConfig() {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !/^[a-zA-Z0-9_-]+$/.test(cloud) || !key || !secret) throw new ApiError('unavailable', 'Media service is not configured.');
  return { cloud, key, secret };
}

export function signParameters(parameters: Record<string, string>, secret: string) {
  const input = Object.keys(parameters).sort().map(key => `${key}=${parameters[key]}`).join('&');
  return createHash('sha1').update(input + secret).digest('hex');
}

export async function uploadAsset(bytes: Uint8Array, mime: string, folder: string, type: 'upload' | 'authenticated') {
  const { cloud, key, secret } = cloudinaryConfig();
  const parameters = { timestamp: String(Math.floor(Date.now() / 1000)), public_id: `${folder}/${randomUUID()}`, type, overwrite: 'false' };
  const form = new FormData();
  for (const [k, v] of Object.entries(parameters)) form.set(k, v);
  form.set('api_key', key); form.set('signature', signParameters(parameters, secret));
  form.set('file', new Blob([new Uint8Array(bytes)], { type: mime }), mime === 'application/pdf' ? 'certificate.pdf' : 'image');
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: 'POST', body: form, signal: AbortSignal.timeout(45000) });
  const data = await response.json();
  if (!response.ok || typeof data.public_id !== 'string' || typeof data.secure_url !== 'string') throw new ApiError('unavailable', 'Media upload failed.');
  return { publicId: data.public_id as string, url: data.secure_url as string, format: data.format as string };
}

export function privateDownload(publicId: string) {
  const { cloud, key, secret } = cloudinaryConfig();
  const params = { public_id: publicId, format: 'pdf', type: 'authenticated', timestamp: String(Math.floor(Date.now() / 1000)), expires_at: String(Math.floor(Date.now() / 1000) + 300), attachment: 'true' };
  const query = new URLSearchParams({ ...params, api_key: key, signature: signParameters(params, secret) });
  return `https://api.cloudinary.com/v1_1/${cloud}/image/download?${query}`;
}
