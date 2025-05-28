import { Router, Request, Response, NextFunction } from 'express';
import { AuthController } from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';
import { ILoginRequest, IAuthResponse } from '../types';

// You'll need to define or import AuthRequest type
interface AuthRequest extends Request {
    user?: any; // Define this based on your user structure
}

const router = Router();

// Public routes
router.post(
    '/login',
    async (req: Request<{}, {}, ILoginRequest>, res: Response<IAuthResponse>, next: NextFunction) => {
        try {
            await AuthController.login(req, res);
        } catch (error) {
            console.error('Login error:', error);
            next(error);
        }
    }
);

// Protected routes
// Both routes should handle errors the same way
router.get(
    '/profile',
    authMiddleware,
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            await AuthController.getProfile(req, res);
            
        } catch (error) {
            console.error('Get profile error:', error);
            next(error);
        }
    }
);

export default router;