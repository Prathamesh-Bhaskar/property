// src/controllers/favoriteController.ts
import { Request, Response } from 'express';
import { Favorite } from '../models/Favorite';
import { Property } from '../models/Property';
import { CacheService } from '../cache/cacheService';
import {
    ICreateFavoriteRequest,
    IUpdateFavoriteRequest,
    IFavoriteQuery,
    IFavoriteResponse
} from '../types/index';

interface AuthRequest extends Request {
    user?: any;
}

export class FavoriteController {
    // Add a property to favorites
    static async addToFavorites(
        req: Request<{}, IFavoriteResponse, ICreateFavoriteRequest>,
        res: Response<IFavoriteResponse>
    ) {
        try {
            const { propertyId, notes, tags } = req.body;
            const authReq = req as AuthRequest;

            // Validation
            if (!propertyId) {
                return res.status(400).json({
                    success: false,
                    message: 'Property ID is required'
                });
            }

            // Check if property exists
            const property = await Property.findById(propertyId);
            if (!property) {
                return res.status(404).json({
                    success: false,
                    message: 'Property not found'
                });
            }

            // Check cache for existing favorite first
            const cachedStatus = await CacheService.getCachedFavoriteStatus(authReq.user.id, propertyId);
            if (cachedStatus && cachedStatus.isFavorited) {
                return res.status(400).json({
                    success: false,
                    message: 'Property is already in your favorites'
                });
            }

            // Check if already favorited in database
            const existingFavorite = await Favorite.findOne({
                userId: authReq.user.id,
                propertyId: propertyId
            });

            if (existingFavorite) {
                // Update cache with correct status
                await CacheService.cacheFavoriteStatus(authReq.user.id, propertyId, {
                    isFavorited: true,
                    favoriteId: existingFavorite._id.toString()
                });

                return res.status(400).json({
                    success: false,
                    message: 'Property is already in your favorites'
                });
            }

            // Create favorite
            const favorite = new Favorite({
                userId: authReq.user.id,
                propertyId: propertyId,
                notes: notes || '',
                tags: tags || []
            });

            await favorite.save();

            // Populate the favorite with property details
            const populatedFavorite = await Favorite.findById(favorite._id)
                .populate('propertyId', 'id title type price state city areaSqFt bedrooms bathrooms listingType')
                .populate('userId', 'username email');

            const favoriteResponse = {
                _id: populatedFavorite?._id.toString(),
                userId: populatedFavorite?.userId.toString() || "",
                propertyId: populatedFavorite?.propertyId.toString() || "",
                notes: populatedFavorite?.notes,
                tags: populatedFavorite?.tags,
                createdAt: populatedFavorite?.createdAt,
                updatedAt: populatedFavorite?.updatedAt,
                property: populatedFavorite?.propertyId as any,
                user: populatedFavorite?.userId as any
            };

            // Update caches
            await CacheService.cacheFavoriteStatus(authReq.user.id, propertyId, {
                isFavorited: true,
                favoriteId: favorite._id.toString()
            });
            await CacheService.invalidateFavorites(authReq.user.id);

            res.status(201).json({
                success: true,
                message: 'Property added to favorites successfully',
                favorite: favoriteResponse
            });

        } catch (error: any) {
            console.error('Add to favorites error:', error);

            if (error.name === 'ValidationError') {
                const messages = Object.values(error.errors).map((err: any) => err.message);
                return res.status(400).json({
                    success: false,
                    message: messages.join(', ')
                });
            }

            if (error.code === 11000) {
                return res.status(400).json({
                    success: false,
                    message: 'Property is already in your favorites'
                });
            }

            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Remove a property from favorites
    static async removeFromFavorites(req: Request, res: Response<IFavoriteResponse>) {
        try {
            const { propertyId } = req.params;
            const authReq = req as AuthRequest;

            if (!propertyId) {
                return res.status(400).json({
                    success: false,
                    message: 'Property ID is required'
                });
            }

            // Find and delete the favorite
            const deletedFavorite = await Favorite.findOneAndDelete({
                userId: authReq.user.id,
                propertyId: propertyId
            });

            if (!deletedFavorite) {
                return res.status(404).json({
                    success: false,
                    message: 'Favorite not found'
                });
            }

            // Update caches
            await CacheService.cacheFavoriteStatus(authReq.user.id, propertyId, {
                isFavorited: false
            });
            await CacheService.invalidateFavorites(authReq.user.id);

            res.json({
                success: true,
                message: 'Property removed from favorites successfully'
            });

        } catch (error: any) {
            console.error('Remove from favorites error:', error);

            if (error.name === 'CastError') {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid property ID format'
                });
            }

            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Get user's favorites list
    static async getUserFavorites(
        req: Request<{}, IFavoriteResponse, {}, IFavoriteQuery>,
        res: Response<IFavoriteResponse>
    ) {
        try {
            const authReq = req as AuthRequest;
            const {
                page = 1,
                limit = 10,
                search,
                tags,
                sortBy = 'newest'
            } = req.query;

            // Try to get from cache first (only for simple queries without search/tags filters)
            if (!search && !tags) {
                const cachedResult = await CacheService.getCachedUserFavorites(
                    authReq.user.id,
                    Number(page),
                    Number(limit)
                );
                if (cachedResult) {
                    console.log('Returning cached user favorites');
                    return res.json(cachedResult);
                }
            }

            // Build filter
            const filter: any = { userId: authReq.user.id };

            // Build sort option
            let sortOption: any = {};
            switch (sortBy) {
                case 'oldest':
                    sortOption = { createdAt: 1 };
                    break;
                case 'property_name':
                    sortOption = { 'property.title': 1 };
                    break;
                case 'newest':
                default:
                    sortOption = { createdAt: -1 };
                    break;
            }

            // Calculate pagination
            const skip = (Number(page) - 1) * Number(limit);

            // Build aggregation pipeline
            const pipeline: any[] = [
                { $match: filter },
                {
                    $lookup: {
                        from: 'properties',
                        localField: 'propertyId',
                        foreignField: '_id',
                        as: 'property'
                    }
                },
                { $unwind: '$property' },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'userId',
                        foreignField: '_id',
                        as: 'user'
                    }
                },
                { $unwind: '$user' },
                {
                    $project: {
                        _id: 1,
                        userId: 1,
                        propertyId: 1,
                        notes: 1,
                        tags: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        'property._id': 1,
                        'property.id': 1,
                        'property.title': 1,
                        'property.type': 1,
                        'property.price': 1,
                        'property.state': 1,
                        'property.city': 1,
                        'property.areaSqFt': 1,
                        'property.bedrooms': 1,
                        'property.bathrooms': 1,
                        'property.listingType': 1,
                        'property.isVerified': 1,
                        'property.colorTheme': 1,
                        'property.rating': 1,
                        'user.username': 1,
                        'user.email': 1
                    }
                }
            ];

            // Add search filter if provided
            if (search) {
                pipeline.splice(-1, 0, {
                    $match: {
                        $or: [
                            { 'property.title': { $regex: search, $options: 'i' } },
                            { 'property.type': { $regex: search, $options: 'i' } },
                            { 'property.state': { $regex: search, $options: 'i' } },
                            { 'property.city': { $regex: search, $options: 'i' } },
                            { notes: { $regex: search, $options: 'i' } }
                        ]
                    }
                });
            }

            // Add tags filter if provided
            if (tags) {
                const tagsArray = tags.split(',').map(tag => tag.trim());
                pipeline.splice(-1, 0, {
                    $match: { tags: { $in: tagsArray } }
                });
            }

            // Add sorting
            pipeline.push({ $sort: sortOption });

            // Execute aggregation with pagination
            const [favorites, totalResult] = await Promise.all([
                Favorite.aggregate([
                    ...pipeline,
                    { $skip: skip },
                    { $limit: Number(limit) }
                ]),
                Favorite.aggregate([
                    ...pipeline,
                    { $count: 'total' }
                ])
            ]);

            const total = totalResult[0]?.total || 0;
            const totalPages = Math.ceil(total / Number(limit));

            // Format the response
            const formattedFavorites = favorites.map((fav: any) => ({
                _id: fav._id.toString(),
                userId: fav.userId.toString(),
                propertyId: fav.propertyId.toString(),
                notes: fav.notes,
                tags: fav.tags,
                createdAt: fav.createdAt,
                updatedAt: fav.updatedAt,
                property: {
                    ...fav.property,
                    _id: fav.property._id.toString()
                },
                user: fav.user
            }));

            const response = {
                success: true,
                message: 'Favorites retrieved successfully',
                favorites: formattedFavorites,
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages
            };

            // Cache the results only for simple queries
            if (!search && !tags) {
                await CacheService.cacheUserFavorites(
                    authReq.user.id,
                    Number(page),
                    Number(limit),
                    response
                );
            }

            res.json(response);

        } catch (error) {
            console.error('Get user favorites error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Update favorite (notes and tags)
    static async updateFavorite(
        req: Request<{ id: string }, IFavoriteResponse, IUpdateFavoriteRequest>,
        res: Response<IFavoriteResponse>
    ) {
        try {
            const { id } = req.params;
            const { notes, tags } = req.body;
            const authReq = req as AuthRequest;

            // Find and update the favorite
            const updatedFavorite = await Favorite.findOneAndUpdate(
                { _id: id, userId: authReq.user.id },
                { notes, tags },
                { new: true, runValidators: true }
            )
                .populate('propertyId', 'id title type price state city areaSqFt bedrooms bathrooms listingType')
                .populate('userId', 'username email');

            if (!updatedFavorite) {
                return res.status(404).json({
                    success: false,
                    message: 'Favorite not found'
                });
            }

            const favoriteResponse = {
                _id: updatedFavorite._id.toString(),
                userId: updatedFavorite.userId.toString(),
                propertyId: updatedFavorite.propertyId.toString(),
                notes: updatedFavorite.notes,
                tags: updatedFavorite.tags,
                createdAt: updatedFavorite.createdAt,
                updatedAt: updatedFavorite.updatedAt,
                property: updatedFavorite.propertyId as any,
                user: updatedFavorite.userId as any
            };

            // Invalidate related caches
            await CacheService.invalidateFavorites(authReq.user.id);

            res.json({
                success: true,
                message: 'Favorite updated successfully',
                favorite: favoriteResponse
            });

        } catch (error: any) {
            console.error('Update favorite error:', error);

            if (error.name === 'ValidationError') {
                const messages = Object.values(error.errors).map((err: any) => err.message);
                return res.status(400).json({
                    success: false,
                    message: messages.join(', ')
                });
            }

            if (error.name === 'CastError') {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid favorite ID format'
                });
            }

            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Check if a property is favorited by user
    static async checkFavoriteStatus(req: Request, res: Response) {
        try {
            const { propertyId } = req.params;
            const authReq = req as AuthRequest;

            // Try to get from cache first
            const cachedStatus = await CacheService.getCachedFavoriteStatus(authReq.user.id, propertyId);
            if (cachedStatus) {
                console.log('Returning cached favorite status');
                return res.json({
                    success: true,
                    message: 'Favorite status retrieved',
                    isFavorited: cachedStatus.isFavorited,
                    favoriteId: cachedStatus.favoriteId || null
                });
            }

            const favorite = await Favorite.findOne({
                userId: authReq.user.id,
                propertyId: propertyId
            });

            const status = {
                isFavorited: !!favorite,
                favoriteId: favorite?._id.toString() || null
            };

            // Cache the status
            const cacheStatus: { isFavorited: boolean; favoriteId?: string } = {
                isFavorited: status.isFavorited
            };
            if (status.favoriteId) {
                cacheStatus.favoriteId = status.favoriteId;
            }
            await CacheService.cacheFavoriteStatus(authReq.user.id, propertyId, cacheStatus);

            res.json({
                success: true,
                message: 'Favorite status retrieved',
                ...status
            });

        } catch (error: any) {
            console.error('Check favorite status error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
}