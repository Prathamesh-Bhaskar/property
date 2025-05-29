// src/cache/cacheService.ts
import { redisClient } from './redisClient';
import { IProperty, IUser, IFavorite } from '../types/index';

export class CacheService {
  private static readonly TTL = {
    PROPERTY: 60 * 15, // 15 minutes
    USER: 60 * 30, // 30 minutes
    SEARCH: 60 * 5, // 5 minutes
    FAVORITES: 60 * 10, // 10 minutes
    PROPERTY_LIST: 60 * 10, // 10 minutes
  };

  private static readonly KEYS = {
    PROPERTY: (id: string) => `property:${id}`,
    USER_PROFILE: (id: string) => `user:profile:${id}`,
    USER_PROPERTIES: (userId: string, page: number = 1, limit: number = 10) => 
      `user:properties:${userId}:${page}:${limit}`,
    PROPERTY_SEARCH: (query: string) => `search:properties:${query}`,
    USER_FAVORITES: (userId: string, page: number = 1, limit: number = 10) => 
      `user:favorites:${userId}:${page}:${limit}`,
    FAVORITE_STATUS: (userId: string, propertyId: string) => 
      `favorite:status:${userId}:${propertyId}`,
  };

  // Generic cache methods
  private static async setCache(key: string, data: any, ttl: number): Promise<void> {
    try {
      const client = redisClient.getClient();
      if (!client) return;

      await client.setex(key, ttl, JSON.stringify(data));
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
    }
  }

  private static async getCache<T>(key: string): Promise<T | null> {
    try {
      const client = redisClient.getClient();
      if (!client) return null;

      const data = await client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  private static async deleteCache(key: string): Promise<void> {
    try {
      const client = redisClient.getClient();
      if (!client) return;

      await client.del(key);
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
    }
  }

  private static async deleteCachePattern(pattern: string): Promise<void> {
    try {
      const client = redisClient.getClient();
      if (!client) return;

      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(...keys);
      }
    } catch (error) {
      console.error(`Cache pattern delete error for pattern ${pattern}:`, error);
    }
  }

  // Property caching methods
  static async cacheProperty(property: IProperty): Promise<void> {
    if (!property._id) return;
    await this.setCache(
      this.KEYS.PROPERTY(property._id),
      property,
      this.TTL.PROPERTY
    );
  }

  static async getCachedProperty(propertyId: string): Promise<IProperty | null> {
    return await this.getCache<IProperty>(this.KEYS.PROPERTY(propertyId));
  }

  static async invalidateProperty(propertyId: string): Promise<void> {
    await this.deleteCache(this.KEYS.PROPERTY(propertyId));
    // Also invalidate search results that might contain this property
    await this.deleteCachePattern('search:properties:*');
    await this.deleteCachePattern('user:properties:*');
  }

  // User caching methods
  static async cacheUserProfile(user: Omit<IUser, 'password'>): Promise<void> {
    if (!user._id) return;
    await this.setCache(
      this.KEYS.USER_PROFILE(user._id),
      user,
      this.TTL.USER
    );
  }

  static async getCachedUserProfile(userId: string): Promise<Omit<IUser, 'password'> | null> {
    return await this.getCache<Omit<IUser, 'password'>>(this.KEYS.USER_PROFILE(userId));
  }

  static async invalidateUserProfile(userId: string): Promise<void> {
    await this.deleteCache(this.KEYS.USER_PROFILE(userId));
  }

  // Property search caching
  static async cachePropertySearch(query: any, results: any): Promise<void> {
    const queryKey = this.generateSearchKey(query);
    await this.setCache(
      this.KEYS.PROPERTY_SEARCH(queryKey),
      results,
      this.TTL.SEARCH
    );
  }

  static async getCachedPropertySearch(query: any): Promise<any | null> {
    const queryKey = this.generateSearchKey(query);
    return await this.getCache(this.KEYS.PROPERTY_SEARCH(queryKey));
  }

  static async invalidatePropertySearches(): Promise<void> {
    await this.deleteCachePattern('search:properties:*');
  }

  // User properties caching
  static async cacheUserProperties(userId: string, page: number, limit: number, results: any): Promise<void> {
    await this.setCache(
      this.KEYS.USER_PROPERTIES(userId, page, limit),
      results,
      this.TTL.PROPERTY_LIST
    );
  }

  static async getCachedUserProperties(userId: string, page: number, limit: number): Promise<any | null> {
    return await this.getCache(this.KEYS.USER_PROPERTIES(userId, page, limit));
  }

  static async invalidateUserProperties(userId: string): Promise<void> {
    await this.deleteCachePattern(`user:properties:${userId}:*`);
    await this.invalidatePropertySearches();
  }

  // Favorites caching methods
  static async cacheFavoriteStatus(userId: string, propertyId: string, status: { isFavorited: boolean; favoriteId?: string }): Promise<void> {
    await this.setCache(
      this.KEYS.FAVORITE_STATUS(userId, propertyId),
      status,
      this.TTL.FAVORITES
    );
  }

  static async getCachedFavoriteStatus(userId: string, propertyId: string): Promise<{ isFavorited: boolean; favoriteId?: string } | null> {
    return await this.getCache(this.KEYS.FAVORITE_STATUS(userId, propertyId));
  }

  static async cacheUserFavorites(userId: string, page: number, limit: number, results: any): Promise<void> {
    await this.setCache(
      this.KEYS.USER_FAVORITES(userId, page, limit),
      results,
      this.TTL.FAVORITES
    );
  }

  static async getCachedUserFavorites(userId: string, page: number, limit: number): Promise<any | null> {
    return await this.getCache(this.KEYS.USER_FAVORITES(userId, page, limit));
  }

  static async invalidateFavorites(userId: string): Promise<void> {
    await this.deleteCachePattern(`user:favorites:${userId}:*`);
    await this.deleteCachePattern(`favorite:status:${userId}:*`);
  }

  static async invalidateSpecificFavorite(userId: string, propertyId: string): Promise<void> {
    await this.deleteCache(this.KEYS.FAVORITE_STATUS(userId, propertyId));
    await this.deleteCachePattern(`user:favorites:${userId}:*`);
  }

  // Helper method to generate consistent search keys
  private static generateSearchKey(query: any): string {
    // Sort query parameters to ensure consistent keys
    const sortedQuery = Object.keys(query)
      .sort()
      .reduce((obj: any, key) => {
        obj[key] = query[key];
        return obj;
      }, {});

    return Buffer.from(JSON.stringify(sortedQuery)).toString('base64');
  }

  // Cache warming methods
  static async warmPropertyCache(propertyId: string, property: IProperty): Promise<void> {
    await this.cacheProperty(property);
  }

  // Cache statistics (useful for monitoring)
  static async getCacheStats(): Promise<any> {
    try {
      const client = redisClient.getClient();
      if (!client) return null;

      const info = await client.info('memory');
      const keyspace = await client.info('keyspace');
      
      return {
        memory: info,
        keyspace: keyspace,
        connected: redisClient.isConnected()
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return null;
    }
  }

  // Clear all cache (use with caution)
  static async clearAllCache(): Promise<void> {
    try {
      const client = redisClient.getClient();
      if (!client) return;

      await client.flushdb();
      console.log('All cache cleared');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }
}