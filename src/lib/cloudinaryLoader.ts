import type { ImageLoaderProps } from 'next/image';

// Use Cloudinary's globally cached WebP variants directly, including older uploads.
export default function cloudinaryLoader({ src, width, quality }: ImageLoaderProps): string {
  const url = new URL(src);
  const marker = '/image/upload/';
  if (url.hostname !== 'res.cloudinary.com' || !url.pathname.includes(marker)) return src;
  url.pathname = url.pathname.replace(marker, `${marker}c_limit,w_${width}/f_webp/q_${quality ?? 75}/`);
  return url.toString();
}

export function isCloudinaryImage(src: string): boolean {
  try {
    const url = new URL(src);
    return url.hostname === 'res.cloudinary.com' && url.pathname.includes('/image/upload/');
  } catch { return false; }
}
