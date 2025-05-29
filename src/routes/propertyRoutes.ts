// src/routes/propertyRoutes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { PropertyController } from '../controllers/propertyController';
import { authMiddleware } from '../middleware/authMiddleware';
import { checkPropertyOwnership } from '../middleware/ownershipMiddleware';
import {
  ICreatePropertyRequest,
  IUpdatePropertyRequest,
  IPropertyResponse,
  IPropertyQuery
} from '../types/index';

interface AuthRequest extends Request {
  user?: any;
}

const router = Router();

// Public routes
router.get(
  '/',
  async (req: Request<{}, IPropertyResponse, {}, IPropertyQuery>, res: Response<IPropertyResponse>, next: NextFunction) => {
    try {
      await PropertyController.getProperties(req, res);
    } catch (error) {
      console.error('Get properties route error:', error);
      next(error);
    }
  }
);

// Protected routes (require authentication)
router.post(
  '/',
  authMiddleware,
  async (req: Request<{}, IPropertyResponse, ICreatePropertyRequest>, res: Response<IPropertyResponse>, next: NextFunction) => {
    try {
      await PropertyController.createProperty(req, res);
    } catch (error) {
      console.error('Create property route error:', error);
      next(error);
    }
  }
);

// IMPORTANT: Put specific routes BEFORE parameterized routes
// This route must be before /:id route to avoid conflicts
router.get(
  '/user/my-properties',
  authMiddleware,
  async (req: AuthRequest, res: Response<IPropertyResponse>, next: NextFunction) => {
    try {
      await PropertyController.getUserProperties(req, res);
    } catch (error) {
      console.error('Get user properties route error:', error);
      next(error);
    }
  }
);

// Parameterized routes (put these AFTER specific routes)
router.get(
  '/:id',
  async (req: Request, res: Response<IPropertyResponse>, next: NextFunction) => {
    try {
      await PropertyController.getPropertyById(req, res);
    } catch (error) {
      console.error('Get property by ID route error:', error);
      next(error);
    }
  }
);

// Protected routes with ownership check
router.put(
  '/:id',
  authMiddleware,
  checkPropertyOwnership,
  async (req: Request<{ id: string }, IPropertyResponse, IUpdatePropertyRequest>, res: Response<IPropertyResponse>, next: NextFunction) => {
    try {
      await PropertyController.updateProperty(req, res);
    } catch (error) {
      console.error('Update property route error:', error);
      next(error);
    }
  }
);

router.patch(
  '/:id',
  authMiddleware,
  checkPropertyOwnership,
  async (req: Request<{ id: string }, IPropertyResponse, IUpdatePropertyRequest>, res: Response<IPropertyResponse>, next: NextFunction) => {
    try {
      await PropertyController.updateProperty(req, res);
    } catch (error) {
      console.error('Patch property route error:', error);
      next(error);
    }
  }
);

router.delete(
  '/:id',
  authMiddleware,
  checkPropertyOwnership,
  async (req: Request, res: Response<IPropertyResponse>, next: NextFunction) => {
    try {
      await PropertyController.deleteProperty(req, res);
    } catch (error) {
      console.error('Delete property route error:', error);
      next(error);
    }
  }
);

export default router;