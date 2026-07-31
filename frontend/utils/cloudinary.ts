import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/**
 * Uploads a File object or Base64 Data URI string to Cloudinary via backend API.
 * Returns the permanent Cloudinary HTTPS URL.
 */
export const uploadImageToCloudinary = async (
  fileOrBase64: File | string,
  folder: string = 'baazi_game_platform'
): Promise<string> => {
  try {
    if (typeof fileOrBase64 === 'string') {
      // Base64 string payload
      const response = await axios.post(`${API_BASE_URL}/api/upload`, {
        image: fileOrBase64,
        folder,
      });
      if (response.data && response.data.success) {
        return response.data.url;
      }
      throw new Error(response.data?.message || 'Cloudinary base64 upload failed');
    } else {
      // File object payload
      const formData = new FormData();
      formData.append('file', fileOrBase64);
      formData.append('folder', folder);

      const response = await axios.post(`${API_BASE_URL}/api/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data && response.data.success) {
        return response.data.url;
      }
      throw new Error(response.data?.message || 'Cloudinary file upload failed');
    }
  } catch (error: any) {
    console.error('Failed to upload image to Cloudinary:', error);
    throw new Error(error.response?.data?.message || error.message || 'Image upload to Cloudinary failed.');
  }
};
