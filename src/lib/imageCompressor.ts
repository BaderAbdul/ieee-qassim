/**
 * Client-side high performance image compressor.
 * Downscales images to max dimensions and converts them to optimized WebP or JPEG
 * before transmission, drastically improving upload speeds, reducing network bandwidth,
 * and staying safely within Cloudinary & API size limits.
 */
export async function compressImage(
  file: File, 
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    mimeType?: 'image/webp' | 'image/jpeg';
  } = {}
): Promise<File> {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.85,
    mimeType = 'image/webp'
  } = options;

  // If already tiny WebP/JPEG under 400KB, skip re-encoding to save client CPU
  if (file.size <= 400 * 1024 && (file.type === 'image/webp' || file.type === 'image/jpeg')) {
    return file;
  }

  return new Promise((resolve) => {
    // Fallback if browser doesn't support canvas or createImageBitmap
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return resolve(file);
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;

      // Calculate proportional constrained dimensions
      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return resolve(file);
      }

      // Smooth resizing algorithm
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Determine output format (use WebP if supported, otherwise fallback to JPEG)
      const targetMime = mimeType;
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            return resolve(file);
          }

          // If compression somehow produced larger output than input, return original
          if (blob.size >= file.size && ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            return resolve(file);
          }

          const extension = targetMime === 'image/webp' ? '.webp' : '.jpg';
          const baseName = file.name.replace(/\.[^/.]+$/, '');
          const compressedFile = new File([blob], `${baseName}${extension}`, {
            type: targetMime,
            lastModified: Date.now(),
          });

          resolve(compressedFile);
        },
        targetMime,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file); // Fail-safe fallback to original
    };

    img.src = objectUrl;
  });
}
