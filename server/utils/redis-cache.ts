import Redis from 'ioredis';
import { LoggerService } from './logger.js';

// Redis client configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000,
};

// Redis client instance
let redisClient: Redis | null = null;

// Initialize Redis connection
export function initializeRedis(): Redis {
  if (!redisClient) {
    redisClient = new Redis(redisConfig);
    
    redisClient.on('connect', () => {
      LoggerService.info('Redis connected successfully');
    });

    redisClient.on('error', (error: any) => {
      LoggerService.error('Redis connection error', {}, error);
    });

    redisClient.on('close', () => {
      LoggerService.warn('Redis connection closed');
    });

    redisClient.on('reconnecting', () => {
      LoggerService.info('Redis reconnecting...');
    });
  }
  
  return redisClient;
}

// Get Redis client
export function getRedisClient(): Redis {
  if (!redisClient) {
    return initializeRedis();
  }
  return redisClient;
}

// Advanced caching class with Redis
export class RedisCache {
  private redis: Redis;
  private defaultTTL = 300; // 5 minutes

  constructor() {
    this.redis = getRedisClient();
  }

  // Set cache with compression
  async set(key: string, data: any, ttl: number = this.defaultTTL): Promise<void> {
    try {
      const serializedData = JSON.stringify(data);
      const compressedData = await this.compress(serializedData);
      
      await this.redis.setex(key, ttl, compressedData);
      
      LoggerService.debug('Cache set', { key, ttl, size: compressedData.length });
    } catch (error) {
      LoggerService.error('Cache set error', { key }, error as Error);
    }
  }

  // Get cache with decompression
  async get<T>(key: string): Promise<T | null> {
    try {
      const compressedData = await this.redis.get(key);
      
      if (!compressedData) {
        return null;
      }

      const serializedData = await this.decompress(compressedData);
      const data = JSON.parse(serializedData);
      
      LoggerService.debug('Cache hit', { key });
      return data;
    } catch (error) {
      LoggerService.error('Cache get error', { key }, error as Error);
      return null;
    }
  }

  // Delete cache
  async delete(key: string): Promise<boolean> {
    try {
      const result = await this.redis.del(key);
      LoggerService.debug('Cache deleted', { key, result });
      return result > 0;
    } catch (error) {
      LoggerService.error('Cache delete error', { key }, error as Error);
      return false;
    }
  }

  // Delete multiple keys by pattern
  async deletePattern(pattern: string): Promise<number> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        const result = await this.redis.del(...keys);
        LoggerService.info('Cache pattern deleted', { pattern, keysCount: keys.length, deletedCount: result });
        return result;
      }
      return 0;
    } catch (error) {
      LoggerService.error('Cache pattern delete error', { pattern }, error as Error);
      return 0;
    }
  }

  // Set cache with tags for easier invalidation
  async setWithTags(key: string, data: any, tags: string[], ttl: number = this.defaultTTL): Promise<void> {
    try {
      // Store the data
      await this.set(key, data, ttl);
      
      // Store tags for this key
      const tagKey = `tags:${key}`;
      await this.redis.setex(tagKey, ttl, JSON.stringify(tags));
      
      // Add key to each tag's set
      for (const tag of tags) {
        const tagSetKey = `tag:${tag}`;
        await this.redis.sadd(tagSetKey, key);
        await this.redis.expire(tagSetKey, ttl);
      }
      
      LoggerService.debug('Cache set with tags', { key, tags, ttl });
    } catch (error) {
      LoggerService.error('Cache set with tags error', { key, tags }, error as Error);
    }
  }

  // Invalidate cache by tags
  async invalidateByTags(tags: string[]): Promise<number> {
    try {
      let totalDeleted = 0;
      
      for (const tag of tags) {
        const tagSetKey = `tag:${tag}`;
        const keys = await this.redis.smembers(tagSetKey);
        
        if (keys.length > 0) {
          // Delete the cached data
          const deleted = await this.redis.del(...keys);
          totalDeleted += deleted;
          
          // Delete tag associations
          await this.redis.del(...keys.map(key => `tags:${key}`));
          
          // Delete the tag set
          await this.redis.del(tagSetKey);
        }
      }
      
      LoggerService.info('Cache invalidated by tags', { tags, deletedCount: totalDeleted });
      return totalDeleted;
    } catch (error) {
      LoggerService.error('Cache invalidate by tags error', { tags }, error as Error);
      return 0;
    }
  }

  // Cache warming - pre-populate frequently accessed data
  async warmCache(warmingData: Array<{ key: string; data: any; tags?: string[]; ttl?: number }>): Promise<void> {
    try {
      LoggerService.info('Starting cache warming', { dataCount: warmingData.length });
      
      for (const item of warmingData) {
        if (item.tags) {
          await this.setWithTags(item.key, item.data, item.tags, item.ttl);
        } else {
          await this.set(item.key, item.data, item.ttl);
        }
      }
      
      LoggerService.info('Cache warming completed', { dataCount: warmingData.length });
    } catch (error) {
      LoggerService.error('Cache warming error', {}, error as Error);
    }
  }

  // Get cache statistics
  async getStats(): Promise<any> {
    try {
      const info = await this.redis.info();
      const memory = await this.redis.info('memory');
      const keyspace = await this.redis.info('keyspace');
      
      return {
        info: this.parseRedisInfo(info),
        memory: parseInt(memory) || 0,
        keyspace: this.parseKeyspaceInfo(keyspace),
      };
    } catch (error) {
      LoggerService.error('Cache stats error', {}, error as Error);
      return null;
    }
  }

  // Cache analytics
  async trackCacheHit(key: string): Promise<void> {
    try {
      await this.redis.hincrby('cache:stats:hits', key, 1);
    } catch (error) {
      LoggerService.error('Cache hit tracking error', { key }, error as Error);
    }
  }

  async trackCacheMiss(key: string): Promise<void> {
    try {
      await this.redis.hincrby('cache:stats:misses', key, 1);
    } catch (error) {
      LoggerService.error('Cache miss tracking error', { key }, error as Error);
    }
  }

  async getCacheAnalytics(): Promise<any> {
    try {
      const hits = await this.redis.hgetall('cache:stats:hits');
      const misses = await this.redis.hgetall('cache:stats:misses');
      
      const analytics: any = {};
      
      // Calculate hit rates for each key
      const allKeys = new Set([...Object.keys(hits), ...Object.keys(misses)]);
      
      allKeys.forEach(key => {
        const hitCount = parseInt(hits[key] || '0');
        const missCount = parseInt(misses[key] || '0');
        const total = hitCount + missCount;
        
        analytics[key] = {
          hits: hitCount,
          misses: missCount,
          total,
          hitRate: total > 0 ? (hitCount / total * 100).toFixed(2) + '%' : '0%',
        };
      });
      
      return analytics;
    } catch (error) {
      LoggerService.error('Cache analytics error', {}, error as Error);
      return {};
    }
  }

  // Simple compression using gzip (in production, you might want to use a more efficient compression)
  private async compress(data: string): Promise<string> {
    // For now, return the data as-is
    // In production, you could use zlib or other compression libraries
    return data;
  }

  private async decompress(data: string): Promise<string> {
    // For now, return the data as-is
    return data;
  }

  private parseRedisInfo(info: string): any {
    const lines = info.split('\r\n');
    const parsed: any = {};
    
    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        parsed[key] = value;
      }
    }
    
    return parsed;
  }

  private parseKeyspaceInfo(info: string): any {
    const lines = info.split('\r\n');
    const keyspace: any = {};
    
    for (const line of lines) {
      if (line.startsWith('db')) {
        const [db, stats] = line.split(':');
        keyspace[db] = stats;
      }
    }
    
    return keyspace;
  }
}

// Global Redis cache instance
export const redisCache = new RedisCache();

// Cache decorator with Redis
export function redisCached(ttl: number = 300, tags?: string[]) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const key = `${target.constructor.name}:${propertyName}:${JSON.stringify(args)}`;
      
      // Try to get from cache first
      const cached = await redisCache.get(key);
      if (cached) {
        await redisCache.trackCacheHit(key);
        return cached;
      }

      // Cache miss - execute method
      await redisCache.trackCacheMiss(key);
      const result = await method.apply(this, args);
      
      // Store in cache
      if (tags) {
        await redisCache.setWithTags(key, result, tags, ttl);
      } else {
        await redisCache.set(key, result, ttl);
      }
      
      return result;
    };
  };
}

// Cache middleware for Express with Redis
export function redisCacheMiddleware(ttl: number = 300, tags?: string[]) {
  return async (req: any, res: any, next: any) => {
    const key = `api:${req.method}:${req.originalUrl}:${JSON.stringify(req.query)}`;
    
    try {
      const cached = await redisCache.get(key);
      if (cached) {
        await redisCache.trackCacheHit(key);
        return res.json(cached);
      }

      await redisCache.trackCacheMiss(key);
      
      // Override res.json to cache the response
      const originalJson = res.json;
      res.json = async function(data: any) {
        if (tags) {
          await redisCache.setWithTags(key, data, tags, ttl);
        } else {
          await redisCache.set(key, data, ttl);
        }
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      LoggerService.error('Redis cache middleware error', { key }, error as Error);
      next();
    }
  };
}

// Graceful shutdown
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    LoggerService.info('Redis connection closed gracefully');
  }
}

// Handle process termination
process.on('SIGTERM', closeRedis);
process.on('SIGINT', closeRedis); 