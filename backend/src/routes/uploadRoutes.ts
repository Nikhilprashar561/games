import express from 'express';
import multer from 'multer';
import { uploadImageToCloudinaryController } from '../controllers/uploadController';

const router = express.Router();

// Multer in-memory storage configuration
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, WEBP, SVG, GIF) are allowed!'));
    }
  },
});

// POST /api/upload - Accepts single file field 'file' or 'image' OR JSON base64 body
router.post('/', upload.single('file'), uploadImageToCloudinaryController);
router.post('/image', upload.single('image'), uploadImageToCloudinaryController);

export default router;
