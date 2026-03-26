import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index';

interface User {
  id: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as User;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};

/**
 * Optional auth: attaches user to req if a valid token is present,
 * but does NOT reject the request if missing or invalid.
 */
export const optionalAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as User;
    req.user = decoded;
  } catch {
    // ignore invalid token for optional auth
  }
  next();
};