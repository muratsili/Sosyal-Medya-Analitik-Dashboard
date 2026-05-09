import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../db/redis';

export async function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const userId = (req as any).user?.userId || req.ip;
  const key = `rate:api:${userId}`;

  try {
    const requests = await redisClient.incr(key);
    
    if (requests === 1) {
      await redisClient.expire(key, 60);
    }

    if (requests > 60) {
      return res.status(429).json({ error: 'Too many requests. Limit is 60 per minute.' });
    }

    next();
  } catch (err) {
    console.error('Rate limit error:', err);
    next(); // Continue even if redis fails
  }
}

export async function likeLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const userId = (req as any).user?.userId || req.ip;
  const key = `rate:like:${userId}`;

  try {
    const likes = await redisClient.incr(key);
    
    if (likes === 1) {
      await redisClient.expire(key, 60);
    }

    if (likes > 30) {
      return res.status(429).json({ error: 'Too many likes. Limit is 30 per minute.' });
    }

    next();
  } catch (err) {
    console.error('Like limit error:', err);
    next();
  }
}
