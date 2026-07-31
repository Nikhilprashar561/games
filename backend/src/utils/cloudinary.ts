import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary if environment variables are present
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

/**
 * Uploads an image string (Base64 data URI or HTTP URL) to Cloudinary.
 * Falls back safely to optimized Base64 Data URI if Cloudinary is offline.
 */
export const uploadImageToCloudinary = async (imageDataUri: string, folderName: string = 'baazi_proofs'): Promise<string> => {
  if (!imageDataUri) return '';

  try {
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      const uploadResult = await cloudinary.uploader.upload(imageDataUri, {
        folder: folderName,
        resource_type: 'image',
      });
      return uploadResult.secure_url;
    }
  } catch (err) {
    console.warn('[Cloudinary Warning]: Falling back to local Base64 storage:', err);
  }

  // Fallback: Return raw/compressed data URI directly
  return imageDataUri;
};

export const uploadBase64ToCloudinary = async (base64Str: string, folderName: string = 'baazi_proofs') => {
  const url = await uploadImageToCloudinary(base64Str, folderName);
  return { url, public_id: `img_${Date.now()}` };
};

export const uploadImageBufferToCloudinary = async (buffer: Buffer, folderName: string = 'baazi_proofs') => {
  const base64Str = `data:image/png;base64,${buffer.toString('base64')}`;
  const url = await uploadImageToCloudinary(base64Str, folderName);
  return { url, public_id: `img_${Date.now()}` };
};
