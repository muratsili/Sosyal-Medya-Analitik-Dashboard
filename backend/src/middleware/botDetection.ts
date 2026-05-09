import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../db/redis';

export async function botDetectionMiddleware(req: Request, res: Response, next: NextFunction) {
  const userId = (req as any).user?.userId || req.ip;
  const key = `bot_check:${userId}`;

  try {
    const postCount = await redisClient.incr(key);
    
    if (postCount === 1) {
      await redisClient.expire(key, 10); // 10 seconds window
    }

    if (postCount > 3) {
      // If user posts more than 3 times in 10 seconds, flag as potential bot
      console.warn(`⚠️ Potential bot detected: ${userId}`);
      (req as any).isBot = true;
      // In a real system, we'd block them or add a flag to the DB
    } else {
      (req as any).isBot = false;
    }

    next();
  } catch (err) {
    console.error('Bot detection error:', err);
    next();
  }
}
