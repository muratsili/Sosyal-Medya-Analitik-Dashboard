import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisClient = createClient({
  url: redisUrl
});

redisClient.on('error', (err) => console.error('❌ Redis Client Error', err));

export async function connectRedis() {
  try {
    await redisClient.connect();
    console.log('✅ Redis connected');
  } catch (err) {
    console.error('❌ Redis connection error:', err);
    process.exit(1);
  }
}

export async function decayTrends() {
  // Simulate sliding window by removing old or low-score tags
  // In production, we'd use multiple keys for different time windows
  const keys = ['trending:hashtags:hourly', 'trending:hashtags:daily', 'trending:hashtags:weekly'];
  for (const key of keys) {
    // Keep only top 100 to prevent unbounded growth
    await redisClient.zRemRangeByRank(key, 0, -101);
  }
}
