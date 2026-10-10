import { authenticate, errorResponse, limitRequests, requireAdmin } from '@/lib/server/request';
import { uploadAsset } from '@/lib/server/cloudinary';
import { ApiError } from '@/lib/server/errors';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const actor = await authenticate(request);
    await limitRequests(actor.uid, 'media', 6);
    const length = Number(request.headers.get('content-length'));
    if (!length || length > 3 * 1024 * 1024 + 65536) throw new ApiError('invalid-argument', 'Choose an image under 3 MB.');
    const form = await request.formData();
    const purpose = form.get('purpose');
    if (purpose !== 'avatar' && purpose !== 'event') throw new ApiError('invalid-argument', 'Invalid upload purpose.');
    if (purpose === 'event') requireAdmin(actor);
    const file = form.get('file');
    if (!(file instanceof File) || file.size > 3 * 1024 * 1024 || file.size === 0) throw new ApiError('invalid-argument', 'Choose an image under 3 MB.');
    const bytes = new Uint8Array(await file.arrayBuffer());
    const buffer = Buffer.from(bytes);
    const detected = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff ? 'image/jpeg'
      : buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? 'image/png'
      : buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP' ? 'image/webp' : null;
    if (!detected || file.type !== detected) throw new ApiError('invalid-argument', 'Only JPG, PNG and WebP images are allowed.');
    const asset = await uploadAsset(bytes, detected, `ieee/${purpose}/${actor.uid}`, 'upload');
    return Response.json({ url: asset.url }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
