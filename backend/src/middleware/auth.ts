import { Request, Response, NextFunction } from 'express';
import { supabaseAnon } from '../lib/supabase';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userEmail?: string;
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized: No token provided' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabaseAnon.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({ error: 'Unauthorized: Invalid token' });
      return;
    }

    req.userId = user.id;
    req.userEmail = user.email;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized' });
  }
};
