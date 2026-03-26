import multer from 'multer';
import path from 'path';
import fs from 'fs';

export const materialsDir = path.join(__dirname, '../../storage/materials');
if (!fs.existsSync(materialsDir)) fs.mkdirSync(materialsDir, { recursive: true });

export const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, materialsDir),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});