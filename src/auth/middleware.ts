import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import * as store from './store.js';

export function bearerAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    jwt.verify(token, config.JWT_SECRET);
  } catch {
    res.status(401).json({ error: 'Invalid or expired access token' });
    return;
  }

  if (store.isAccessTokenRevoked(token)) {
    res.status(401).json({ error: 'Access token has been revoked' });
    return;
  }

  next();
}
