
// src/routes/favoriteRoutes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { FavoriteController } from '../controllers/favoriteController';
import { authMiddleware } from '../middleware/authMiddleware';
import {
    ICreateFavoriteRequest,
    IUpdateFavoriteRequest,
    IFavoriteResponse,
    IFavoriteQuery
} from '../types/index';

interface AuthRequest extends Request {
    user?: any;
}

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Add property to favorites
router.post(
    '/',
    async (req: Request<{}, IFavoriteResponse, ICreateFavoriteRequest>, res: Response<IFavoriteResponse>, next: NextFunction) => {
        try {
            await FavoriteController.addToFavorites(req, res);
        } catch (error) {
            console.error('Add to favorites route error:', error);
            next(error);
        }
    }
);

// Get user's favorites list
router.get(
    '/',
    async (req: Request<{}, IFavoriteResponse, {}, IFavoriteQuery>, res: Response<IFavoriteResponse>, next: NextFunction) => {
        try {
            await FavoriteController.getUserFavorites(req, res);
        } catch (error) {
            console.error('Get favorites route error:', error);
            next(error);
        }
    }
);

// Update favorite (notes and tags)
router.put(
    '/:id',
    async (req: Request<{ id: string }, IFavoriteResponse, IUpdateFavoriteRequest>, res: Response<IFavoriteResponse>, next: NextFunction) => {
        try {
            await FavoriteController.updateFavorite(req, res);
        } catch (error) {
            console.error('Update favorite route error:', error);
            next(error);
        }
    }
);

// Remove property from favorites by property ID
router.delete(
    '/property/:propertyId',
    async (req: Request, res: Response<IFavoriteResponse>, next: NextFunction) => {
        try {
            await FavoriteController.removeFromFavorites(req, res);
        } catch (error) {
            console.error('Remove from favorites route error:', error);
            next(error);
        }
    }
);

// Check if a property is favorited by the user
router.get(
    '/check/:propertyId',
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            await FavoriteController.checkFavoriteStatus(req, res);
        } catch (error) {
            console.error('Check favorite status route error:', error);
            next(error);
        }
    }
);

export default router;