import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { logger } from '../libs/logger';
import multer from 'multer';

export const errorHandler: ErrorRequestHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'File too large' });
  }
  logger.error(err.stack);
  res.status(500).json({ message: 'Internal server error' });
};