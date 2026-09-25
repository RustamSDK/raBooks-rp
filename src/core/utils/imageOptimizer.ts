/**
 * Utility for client-side party avatar profile image validation, square cropping, and compression.
 * Ensures images are optimized to crisp data URLs (~20-40 KB) without bloating local IndexedDB storage.
 */

export interface ImageOptimizationOptions {
  maxDimension?: number;
  maxSizeBytes?: number;
  quality?: number;
}

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
];

const DEFAULT_MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const DEFAULT_MAX_DIMENSION = 256; // 256x256 px is crisp for retina circular avatars up to 128px
const DEFAULT_QUALITY = 0.88;

/**
 * Validates and optimizes an image file into a square base64 Data URL.
 */
export async function optimizePartyImageFile(
  file: File,
  options: ImageOptimizationOptions = {}
): Promise<string> {
  const {
    maxDimension = DEFAULT_MAX_DIMENSION,
    maxSizeBytes = DEFAULT_MAX_SIZE_BYTES,
    quality = DEFAULT_QUALITY,
  } = options;

  // 1. Validate file existence
  if (!file) {
    throw new Error('No image file selected.');
  }

  // 2. Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
    throw new Error(
      `Unsupported file format (${file.type || 'unknown'}). Please upload a PNG, JPEG, WEBP, GIF, or SVG image.`
    );
  }

  // 3. Validate file size
  if (file.size > maxSizeBytes) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    const limitMb = (maxSizeBytes / (1024 * 1024)).toFixed(0);
    throw new Error(`Image file is too large (${sizeMb} MB). Maximum allowed size is ${limitMb} MB.`);
  }

  // 4. If it's an SVG file, convert directly to data URL without raster distortion
  if (file.type === 'image/svg+xml') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to parse SVG image.'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read SVG image.'));
      reader.readAsDataURL(file);
    });
  }

  // 5. Read and compress bitmap images via HTML5 Canvas
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d', { alpha: true });

          if (!ctx) {
            resolve(dataUrl);
            return;
          }

          // Center-crop to a perfect square
          const minSide = Math.min(img.naturalWidth, img.naturalHeight);
          const cropX = (img.naturalWidth - minSide) / 2;
          const cropY = (img.naturalHeight - minSide) / 2;

          const targetSize = Math.min(maxDimension, minSide);
          canvas.width = targetSize;
          canvas.height = targetSize;

          // Enable high-quality smoothing
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Draw cropped and scaled image
          ctx.drawImage(
            img,
            cropX,
            cropY,
            minSide,
            minSide,
            0,
            0,
            targetSize,
            targetSize
          );

          // Try exporting to WebP first, fallback to JPEG/PNG
          let optimizedDataUrl: string;
          try {
            optimizedDataUrl = canvas.toDataURL('image/webp', quality);
            if (!optimizedDataUrl.startsWith('data:image/webp')) {
              optimizedDataUrl = canvas.toDataURL('image/jpeg', quality);
            }
          } catch {
            optimizedDataUrl = canvas.toDataURL('image/jpeg', quality);
          }

          resolve(optimizedDataUrl);
        } catch (err: any) {
          reject(new Error(err?.message || 'Failed to process image canvas.'));
        }
      };

      img.onerror = () => {
        reject(new Error('The uploaded file is not a valid or readable image.'));
      };

      img.src = dataUrl;
    };

    reader.onerror = () => {
      reject(new Error('Unable to read the image file from your system.'));
    };

    reader.readAsDataURL(file);
  });
}
