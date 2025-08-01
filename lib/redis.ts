import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

// Create Redis client
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

// Rate limiting configurations
export const rateLimiters = {
  // General API rate limit
  api: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute
    analytics: true,
    prefix: 'ratelimit:api',
  }),
  
  // Vehicle lookup rate limit (more restrictive)
  vehicleLookup: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '1 m'), // 20 lookups per minute
    analytics: true,
    prefix: 'ratelimit:vehicle-lookup',
  }),
  
  // Auth rate limit (login/register)
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '15 m'), // 5 attempts per 15 minutes
    analytics: true,
    prefix: 'ratelimit:auth',
  }),
};

// Cache helper functions
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redis.get(key);
      return data as T;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  },

  async set(key: string, value: any, expirationInSeconds?: number): Promise<void> {
    try {
      if (expirationInSeconds) {
        await redis.set(key, value, { ex: expirationInSeconds });
      } else {
        await redis.set(key, value);
      }
    } catch (error) {
      console.error('Redis set error:', error);
    }
  },

  async del(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      console.error('Redis del error:', error);
    }
  },

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      console.error('Redis invalidatePattern error:', error);
    }
  },
};

// Session storage helpers
export const sessionStore = {
  async get(sessionId: string): Promise<any> {
    return cache.get(`session:${sessionId}`);
  },

  async set(sessionId: string, data: any, ttlInSeconds: number = 86400): Promise<void> {
    return cache.set(`session:${sessionId}`, data, ttlInSeconds);
  },

  async destroy(sessionId: string): Promise<void> {
    return cache.del(`session:${sessionId}`);
  },

  async touch(sessionId: string, ttlInSeconds: number = 86400): Promise<void> {
    const data = await this.get(sessionId);
    if (data) {
      await this.set(sessionId, data, ttlInSeconds);
    }
  },
};

// Organization cache helpers
export const orgCache = {
  async get(orgId: string): Promise<any> {
    return cache.get(`org:${orgId}`);
  },

  async set(orgId: string, data: any): Promise<void> {
    return cache.set(`org:${orgId}`, data, 300); // 5 minutes
  },

  async invalidate(orgId: string): Promise<void> {
    await cache.del(`org:${orgId}`);
    await cache.invalidatePattern(`org:${orgId}:*`);
  },

  async getVehicles(orgId: string, page: number = 1): Promise<any> {
    return cache.get(`org:${orgId}:vehicles:${page}`);
  },

  async setVehicles(orgId: string, page: number, data: any): Promise<void> {
    return cache.set(`org:${orgId}:vehicles:${page}`, data, 60); // 1 minute
  },
};