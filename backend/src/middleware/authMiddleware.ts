import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export const protect = (req: AuthRequest, res: Response, next: NextFunction) => {
  let token: string | undefined;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const secret = process.env.JWT_SECRET || 'fallback_dev_secret_change_in_env';
      const decoded = jwt.verify(
        token,
        secret
      ) as { id: string; email: string };

      req.user = decoded;
      return next();
    } catch (error: any) {
      if (error && error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Session expired after 7 days. Please log in again.', code: 'TOKEN_EXPIRED' });
      }
      return res.status(401).json({ message: 'Not authorized, token invalid', code: 'INVALID_TOKEN' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }
};
