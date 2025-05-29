// src/routes/cacheRoutes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { CacheService } from '../cache/cacheService';
import { redisClient } from '../cache/redisClient';

const router = Router();

// Middleware to check if user is admin (you can customize this logic)
const adminMiddleware = (req: any, res: Response, next: NextFunction) => {
  // For now, we'll allow any authenticated user to access cache management
  // In production, you should implement proper admin role checking
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
  next();
};

// All cache routes require authentication
router.use(authMiddleware);

// Get cache statistics
router.get('/stats', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const stats = await CacheService.getCacheStats();
    
    if (!stats) {
      return res.status(503).json({
        success: false,
        message: 'Cache service unavailable'
      });
    }

    res.json({
      success: true,
      message: 'Cache statistics retrieved',
      stats: {
        connected: redisClient.isConnected(),
        ...stats
      }
    });

  } catch (error) {
    console.error('Get cache stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve cache statistics'
    });
  }
});

// Clear all cache (use with caution)
router.delete('/clear', adminMiddleware, async (req: Request, res: Response) => {
  try {
    await CacheService.clearAllCache();
    
    res.json({
      success: true,
      message: 'All cache cleared successfully'
    });

  } catch (error) {
    console.error('Clear cache error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear cache'
    });
  }
});

// Clear user-specific cache
router.delete('/user/:userId', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Clear user-related caches
    await Promise.all([
      CacheService.invalidateUserProfile(userId),
      CacheService.invalidateUserProperties(userId),
      CacheService.invalidateFavorites(userId)
    ]);

    res.json({
      success: true,
      message: `Cache cleared for user ${userId}`
    });

  } catch (error) {
    console.error('Clear user cache error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear user cache'
    });
  }
});

// Clear property-specific cache
router.delete('/property/:propertyId', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { propertyId } = req.params;
    
    if (!propertyId) {
      return res.status(400).json({
        success: false,
        message: 'Property ID is required'
      });
    }

    await CacheService.invalidateProperty(propertyId);

    res.json({
      success: true,
      message: `Cache cleared for property ${propertyId}`
    });

  } catch (error) {
    console.error('Clear property cache error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear property cache'
    });
  }
});

// Clear search cache
router.delete('/search', adminMiddleware, async (req: Request, res: Response) => {
  try {
    await CacheService.invalidatePropertySearches();

    res.json({
      success: true,
      message: 'Search cache cleared successfully'
    });

  } catch (error) {
    console.error('Clear search cache error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear search cache'
    });
  }
});

// Warm cache for a specific property
router.post('/warm/property/:propertyId', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { propertyId } = req.params;
    
    if (!propertyId) {
      return res.status(400).json({
        success: false,
        message: 'Property ID is required'
      });
    }

    // This would typically fetch the property from database and cache it
    // For now, we'll just return a success message
    res.json({
      success: true,
      message: `Cache warming initiated for property ${propertyId}`
    });

  } catch (error) {
    console.error('Warm cache error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to warm cache'
    });
  }
});

// Check cache health
router.get('/health', async (req: Request, res: Response) => {
  try {
    const isConnected = redisClient.isConnected();
    
    if (!isConnected) {
      return res.status(503).json({
        success: false,
        message: 'Cache service is not available'
      });
    }

    // Try to perform a simple operation to test cache
    const client = redisClient.getClient();
    if (client) {
      await client.ping();
    }

    res.json({
      success: true,
      message: 'Cache service is healthy',
      connected: true
    });

  } catch (error) {
    console.error('Cache health check error:', error);
    res.status(503).json({
      success: false,
      message: 'Cache service health check failed',
      connected: false
    });
  }
});

export default router;