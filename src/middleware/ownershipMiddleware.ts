// src/middleware/ownershipMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import { Property } from '../models/Property';

interface AuthRequest extends Request {
  user?: any;
}

export const checkPropertyOwnership = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const propertyId = req.params.id;
    const userId = req.user?.id;

    if (!propertyId) {
      res.status(400).json({
        success: false,
        message: 'Property ID is required'
      });
      return;
    }

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
      return;
    }

    // Find the property by MongoDB _id
    const property = await Property.findById(propertyId);

    if (!property) {
      res.status(404).json({
        success: false,
        message: 'Property not found'
      });
      return;
    }

    // Check if the user owns this property
    if (property.createdBy.toString() !== userId.toString()) {
      res.status(403).json({
        success: false,
        message: 'Access denied. You can only modify properties you created.'
      });
      return;
    }

    // Add property to request for use in controller
    req.property = property;
    next();

  } catch (error) {
    console.error('Ownership middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Extend the Request interface to include property
declare global {
  namespace Express {
    interface Request {
      property?: any;
    }
  }
}