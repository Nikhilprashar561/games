import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary with environment credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_CLOUD_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_CLOUD_API_SECRET,
  secure: true,
});

export default cloudinary;

/**
 * Uploads a file buffer (e.g. from Multer memory storage) to Cloudinary.
 * Returns the secure Cloudinary HTTPS URL.
 */
export const uploadImageBufferToCloudinary = (
  buffer: Buffer,
  folder: string = 'baazi_game_platform'
): Promise<{ url: string; public_id: string }> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'auto',
      },
      (error, result) => {
        if (error || !result) {
          return reject(error || new Error('Cloudinary upload failed'));
        }
        resolve({
          url: result.secure_url,
          public_id: result.public_id,
        });
      }
    );
    uploadStream.end(buffer);
  });
};

/**
 * Uploads a Data URI or Base64 Image string or remote URL to Cloudinary.
 * Returns the secure Cloudinary HTTPS URL.
 */
export const uploadBase64ToCloudinary = async (
  base64OrUrl: string,
  folder: string = 'baazi_game_platform'
): Promise<{ url: string; public_id: string }> => {
  try {
    const result = await cloudinary.uploader.upload(base64OrUrl, {
      folder,
      resource_type: 'auto',
    });
    return {
      url: result.secure_url,
      public_id: result.public_id,
    };
  } catch (error) {
    console.error('Cloudinary base64 upload error:', error);
    throw error;
  }
};
