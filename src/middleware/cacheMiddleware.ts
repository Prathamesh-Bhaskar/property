// src/middleware/cacheMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../cache/redisClient';

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  keyGenerator?: (req: Request) => string;
  skipCondition?: (req: Request) => boolean;
}

/**
 * Generic cache middleware for caching route responses
 */
export const cacheMiddleware = (options: CacheOptions = {}) => {
  const {
    ttl = 300, // 5 minutes default
    keyGenerator = (req: Request) => `route:${req.originalUrl}`,
    skipCondition = () => false
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Skip caching if condition is met
      if (skipCondition(req)) {
        return next();
      }

      // Skip caching if Redis is not available
      if (!redisClient.isConnected()) {
        return next();
      }

      const client = redisClient.getClient();
      if (!client) {
        return next();
      }

      // Generate cache key
      const cacheKey = keyGenerator(req);

      // Try to get from cache
      const cachedData = await client.get(cacheKey);
      
      if (cachedData) {
        console.log(`Cache hit for key: ${cacheKey}`);
        const parsedData = JSON.parse(cachedData);
        return res.json(parsedData);
      }

      // Cache miss - intercept response to cache it
      const originalJson = res.json;
      
      res.json = function(data: any) {
        // Cache the response if it's successful
        if (res.statusCode >= 200 && res.statusCode < 300) {
          client.setex(cacheKey, ttl, JSON.stringify(data)).catch(err => {
            console.error(`Failed to cache data for key ${cacheKey}:`, err);
          });
        }
        
        // Call original json method
        return originalJson.call(this, data);
      };

      next();

    } catch (error) {
      console.error('Cache middleware error:', error);
      // Continue without caching on error
      next();
    }
  };
};

/**
 * Specific cache middleware for property searches
 */
export const propertySearchCache = cacheMiddleware({
  ttl: 300, // 5 minutes
  keyGenerator: (req: Request) => {
    const query = req.query;
    const sortedQuery = Object.keys(query)
      .sort()
      .reduce((obj: any, key) => {
        obj[key] = query[key];
        return obj;
      }, {});
    
    const queryString = Buffer.from(JSON.stringify(sortedQuery)).toString('base64');
    return `search:properties:${queryString}`;
  },
  skipCondition: (req: Request) => {
    // Skip caching for authenticated user-specific searches
    return !!req.headers.authorization;
  }
});

/**
 * Cache middleware for public property listings
 */
export const publicPropertyCache = cacheMiddleware({
  ttl: 600, // 10 minutes
  keyGenerator: (req: Request) => {
    const { page = 1, limit = 10 } = req.query;
    return `public:properties:${page}:${limit}`;
  },
  skipCondition: (req: Request) => {
    // Skip if there are filter parameters
    const hasFilters = Object.keys(req.query).some(key => 
      !['page', 'limit'].includes(key)
    );
    return hasFilters;
  }
});

/**
 * Cache middleware for individual property details
 */
export const propertyDetailCache = cacheMiddleware({
  ttl: 900, // 15 minutes
  keyGenerator: (req: Request) => `property:${req.params.id}`,
  skipCondition: () => false // Always try to cache property details
});

/**
 * Utility function to invalidate cache by pattern
 */
export const invalidateCachePattern = async (pattern: string): Promise<void> => {
  try {
    const client = redisClient.getClient();
    if (!client) return;

    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(...keys);
      console.log(`Invalidated ${keys.length} cache keys matching pattern: ${pattern}`);
    }
  } catch (error) {
    console.error(`Failed to invalidate cache pattern ${pattern}:`, error);
  }
};

/**
 * Utility function to invalidate specific cache key
 */
export const invalidateCacheKey = async (key: string): Promise<void> => {
  try {
    const client = redisClient.getClient();
    if (!client) return;

    await client.del(key);
    console.log(`Invalidated cache key: ${key}`);
  } catch (error) {
    console.error(`Failed to invalidate cache key ${key}:`, error);
  }
};

/**
 * Custom cache decorator for controller methods
 */
export const cacheable = (options: CacheOptions = {}) => {
  return (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
    const method = descriptor.value;

    descriptor.value = async function(...args: any[]) {
      const [req, res] = args;
      
      try {
        // Apply cache middleware logic
        await cacheMiddleware(options)(req, res, () => {
          // Continue with original method
          return method.apply(this, args);
        });
      } catch (error) {
        console.error(`Cache decorator error for ${propertyName}:`, error);
        // Fall back to original method
        return method.apply(this, args);
      }
    };

    return descriptor;
  };
};

/**
 * Response time tracking middleware (useful for cache performance monitoring)
 */
export const responseTimeMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
};

/**
 * Cache warming utility
 */
export class CacheWarmer {
  static async warmPropertyCache(propertyIds: string[]): Promise<void> {
    console.log(`Warming cache for ${propertyIds.length} properties...`);
    
    // This would typically make requests to warm the cache
    // For now, we'll just log the action
    for (const id of propertyIds) {
      console.log(`Warming cache for property: ${id}`);
      // In real implementation, you'd make a request to the property endpoint
      // or directly cache the property data
    }
  }

  static async warmSearchCache(commonQueries: any[]): Promise<void> {
    console.log(`Warming cache for ${commonQueries.length} search queries...`);
    
    for (const query of commonQueries) {
      console.log(`Warming cache for search query:`, query);
      // In real implementation, you'd execute the search and cache results
    }
  }
}