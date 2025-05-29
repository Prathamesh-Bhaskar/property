// src/controllers/propertyController.ts
import { Request, Response } from 'express';
import { Property } from '../models/Property';
import { CacheService } from '../cache/cacheService';
import {
    ICreatePropertyRequest,
    IUpdatePropertyRequest,
    IPropertyQuery,
    IPropertyResponse
} from '../types/index';

interface AuthRequest extends Request {
    user?: any;
    property?: any;
}

export class PropertyController {
    static async createProperty(
        req: Request<{}, IPropertyResponse, ICreatePropertyRequest>,
        res: Response<IPropertyResponse>
    ) {
        try {
            const propertyData = req.body;
            const authReq = req as AuthRequest;

            // Validation
            const requiredFields = [
                'id', 'title', 'type', 'price', 'state', 'city', 'areaSqFt',
                'bedrooms', 'bathrooms', 'amenities', 'furnished', 'availableFrom',
                'listedBy', 'tags', 'colorTheme', 'rating', 'listingType'
            ];

            for (const field of requiredFields) {
                if (!propertyData[field as keyof ICreatePropertyRequest]) {
                    return res.status(400).json({
                        success: false,
                        message: `${field} is required`
                    });
                }
            }

            // Check if property ID already exists
            const existingProperty = await Property.findOne({ id: propertyData.id });
            if (existingProperty) {
                return res.status(400).json({
                    success: false,
                    message: 'Property with this ID already exists'
                });
            }

            // Create property with authenticated user as creator
            const property = new Property({
                ...propertyData,
                createdBy: authReq.user.id
            });

            await property.save();

            const propertyResponse = {
                ...property.toJSON(),
                _id: property._id.toString(),
                createdBy: property.createdBy?.toString() || ""
            };

            // Cache the new property
            await CacheService.cacheProperty(propertyResponse);
            
            // Invalidate related caches
            await CacheService.invalidatePropertySearches();
            await CacheService.invalidateUserProperties(authReq.user.id);

            res.status(201).json({
                success: true,
                message: 'Property created successfully',
                property: propertyResponse
            });

        } catch (error: any) {
            console.error('Create property error:', error);

            if (error.name === 'ValidationError') {
                const messages = Object.values(error.errors).map((err: any) => err.message);
                return res.status(400).json({
                    success: false,
                    message: messages.join(', ')
                });
            }

            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    static async getProperties(
        req: Request<{}, IPropertyResponse, {}, IPropertyQuery>,
        res: Response<IPropertyResponse>
    ) {
        try {
            const {
                page = 1,
                limit = 10,
                type,
                state,
                city,
                minPrice,
                maxPrice,
                bedrooms,
                bathrooms,
                furnished,
                listingType,
                isVerified,
                listedBy,
                search
            } = req.query;

            // Try to get from cache first
            const cachedResult = await CacheService.getCachedPropertySearch(req.query);
            if (cachedResult) {
                console.log('Returning cached property search results');
                return res.json(cachedResult);
            }

            // Build filter object
            const filter: any = {};

            if (type) filter.type = new RegExp(type, 'i');
            if (state) filter.state = new RegExp(state, 'i');
            if (city) filter.city = new RegExp(city, 'i');
            if (furnished) filter.furnished = furnished;
            if (listingType) filter.listingType = listingType;
            if (typeof isVerified === 'string') {
                filter.isVerified = isVerified === 'true';
            } else if (typeof isVerified === 'boolean') {
                filter.isVerified = isVerified;
            }
            if (listedBy) filter.listedBy = new RegExp(listedBy, 'i');

            // Price range filter
            if (minPrice || maxPrice) {
                filter.price = {};
                if (minPrice) filter.price.$gte = Number(minPrice);
                if (maxPrice) filter.price.$lte = Number(maxPrice);
            }

            // Bedroom/bathroom filters
            if (bedrooms) filter.bedrooms = Number(bedrooms);
            if (bathrooms) filter.bathrooms = Number(bathrooms);

            // Text search
            if (search) {
                filter.$text = { $search: search };
            }

            // Calculate pagination
            const skip = (Number(page) - 1) * Number(limit);

            // Execute query with pagination
            const [properties, total] = await Promise.all([
                Property.find(filter)
                    .populate('createdBy', 'username email')
                    .sort(search ? { score: { $meta: 'textScore' } } : { createdAt: -1 })
                    .skip(skip)
                    .limit(Number(limit)),
                Property.countDocuments(filter)
            ]);

            const totalPages = Math.ceil(total / Number(limit));

            const response = {
                success: true,
                message: 'Properties retrieved successfully',
                properties: properties.map(p => {
                    const propertyObj = p.toJSON();
                    return {
                        ...propertyObj,
                        _id: p._id.toString(),
                        createdBy: p.createdBy ? p.createdBy.toString() : ""
                    };
                }),
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages
            };

            // Cache the search results
            await CacheService.cachePropertySearch(req.query, response);

            // Cache individual properties
            for (const property of properties) {
                const propertyObj = {
                    ...property.toJSON(),
                    _id: property._id.toString(),
                    createdBy: property.createdBy ? property.createdBy.toString() : ""
                };
                await CacheService.cacheProperty(propertyObj);
            }

            res.json(response);

        } catch (error) {
            console.error('Get properties error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    static async getPropertyById(req: Request, res: Response<IPropertyResponse>) {
        try {
            const propertyId = req.params.id;

            // Try to get from cache first
            const cachedProperty = await CacheService.getCachedProperty(propertyId);
            if (cachedProperty) {
                console.log('Returning cached property');
                return res.json({
                    success: true,
                    message: 'Property retrieved successfully',
                    property: cachedProperty
                });
            }

            const property = await Property.findById(propertyId)
                .populate('createdBy', 'username email');

            if (!property) {
                return res.status(404).json({
                    success: false,
                    message: 'Property not found'
                });
            }

            const propertyResponse = {
                ...property.toJSON(),
                _id: property._id.toString(),
                createdBy: property.createdBy ? property.createdBy.toString() : ""
            };

            // Cache the property
            await CacheService.cacheProperty(propertyResponse);

            res.json({
                success: true,
                message: 'Property retrieved successfully',
                property: propertyResponse
            });

        } catch (error) {
            console.error('Get property error:', error);

            const err = error as any;
            if (err.name === 'CastError') {
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

    static async updateProperty(
        req: Request<{ id: string }, IPropertyResponse, IUpdatePropertyRequest>,
        res: Response<IPropertyResponse>
    ) {
        try {
            const updateData = req.body;
            const authReq = req as AuthRequest;

            // Remove fields that shouldn't be updated
            delete (updateData as any).createdBy;
            delete (updateData as any).id; // Don't allow changing the property ID

            // Update the property
            const updatedProperty = await Property.findByIdAndUpdate(
                req.params.id,
                updateData,
                { new: true, runValidators: true }
            ).populate('createdBy', 'username email');

            if (!updatedProperty) {
                return res.status(404).json({
                    success: false,
                    message: 'Property not found'
                });
            }

            const propertyResponse = {
                ...updatedProperty.toJSON(),
                _id: updatedProperty._id.toString(),
                createdBy: updatedProperty.createdBy ? updatedProperty.createdBy.toString() : ""
            };

            // Update cache and invalidate related caches
            await CacheService.cacheProperty(propertyResponse);
            await CacheService.invalidatePropertySearches();
            await CacheService.invalidateUserProperties(authReq.user.id);

            res.json({
                success: true,
                message: 'Property updated successfully',
                property: propertyResponse
            });

        } catch (error: any) {
            console.error('Update property error:', error);

            if (error.name === 'ValidationError') {
                const messages = Object.values(error.errors).map((err: any) => err.message);
                return res.status(400).json({
                    success: false,
                    message: messages.join(', ')
                });
            }

            const err = error as any;
            if (err.name === 'CastError') {
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

    static async deleteProperty(req: Request, res: Response<IPropertyResponse>) {
        try {
            const propertyId = req.params.id;
            const authReq = req as AuthRequest;

            const deletedProperty = await Property.findByIdAndDelete(propertyId);

            if (!deletedProperty) {
                return res.status(404).json({
                    success: false,
                    message: 'Property not found'
                });
            }

            // Invalidate all related caches
            await CacheService.invalidateProperty(propertyId);
            await CacheService.invalidateUserProperties(authReq.user.id);

            res.json({
                success: true,
                message: 'Property deleted successfully'
            });

        } catch (error: any) {
            console.error('Delete property error:', error);

            const err = error as any;
            if (err.name === 'CastError') {
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

    static async getUserProperties(req: Request, res: Response<IPropertyResponse>) {
        try {
            const authReq = req as AuthRequest;
            const {
                page = 1,
                limit = 10
            } = req.query;

            // Try to get from cache first
            const cachedResult = await CacheService.getCachedUserProperties(
                authReq.user.id, 
                Number(page), 
                Number(limit)
            );
            if (cachedResult) {
                console.log('Returning cached user properties');
                return res.json(cachedResult);
            }

            const skip = (Number(page) - 1) * Number(limit);

            const [properties, total] = await Promise.all([
                Property.find({ createdBy: authReq.user.id })
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(Number(limit)),
                Property.countDocuments({ createdBy: authReq.user.id })
            ]);

            const totalPages = Math.ceil(total / Number(limit));

            const response = {
                success: true,
                message: 'User properties retrieved successfully',
                properties: properties.map(p => {
                    const propertyObj = p.toJSON();
                    return {
                        ...propertyObj,
                        _id: p._id.toString(),
                        createdBy: p.createdBy ? p.createdBy.toString() : ""
                    };
                }),
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages
            };

            // Cache the results
            await CacheService.cacheUserProperties(
                authReq.user.id, 
                Number(page), 
                Number(limit), 
                response
            );

            // Cache individual properties
            for (const property of properties) {
                const propertyObj = {
                    ...property.toJSON(),
                    _id: property._id.toString(),
                    createdBy: property.createdBy ? property.createdBy.toString() : ""
                };
                await CacheService.cacheProperty(propertyObj);
            }

            res.json(response);

        } catch (error) {
            console.error('Get user properties error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
}