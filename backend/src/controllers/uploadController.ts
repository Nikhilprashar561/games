import { Request, Response } from 'express';
import { uploadImageBufferToCloudinary, uploadBase64ToCloudinary } from '../utils/cloudinary';

/**
 * Controller to upload any image file or base64 data to Cloudinary
 * Returns the permanent Cloudinary secure URL.
 */
export const uploadImageToCloudinaryController = async (req: Request, res: Response) => {
  try {
    const file = req.file;
    const { image, folder } = req.body;
    const targetFolder = folder || 'baazi_game_platform';

    // 1. Handle File Upload (Multer Memory Buffer)
    if (file && file.buffer) {
      const result = await uploadImageBufferToCloudinary(file.buffer, targetFolder);
      return res.status(200).json({
        success: true,
        message: 'Image uploaded successfully to Cloudinary!',
        url: result.url,
        public_id: result.public_id,
      });
    }

    // 2. Handle Base64 Data URI or Image URL
    if (image && typeof image === 'string') {
      const result = await uploadBase64ToCloudinary(image, targetFolder);
      return res.status(200).json({
        success: true,
        message: 'Base64 image uploaded successfully to Cloudinary!',
        url: result.url,
        public_id: result.public_id,
      });
    }

    return res.status(400).json({
      success: false,
      message: 'No image file or base64 image string provided.',
    });
  } catch (error: any) {
    console.error('Cloudinary Controller Upload Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload image to Cloudinary.',
    });
  }
};
