// src/models/Property.ts
import mongoose, { Schema, Document, Types } from 'mongoose';
import { IProperty } from '../types/index';

interface IPropertyDocument extends Omit<IProperty, '_id' | 'id' | 'createdBy'>, Document {
    _id: Types.ObjectId;
    id: string;
    createdBy: Types.ObjectId;
}

const propertySchema = new Schema<IPropertyDocument>({
    id: {
        type: String,
        required: [true, 'Property ID is required'],
        unique: true,
        trim: true
    },
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
        maxlength: [200, 'Title cannot exceed 200 characters']
    },
    type: {
        type: String,
        required: [true, 'Property type is required'],
        trim: true
    },
    price: {
        type: Number,
        required: [true, 'Price is required'],
        min: [0, 'Price must be positive']
    },
    state: {
        type: String,
        required: [true, 'State is required'],
        trim: true
    },
    city: {
        type: String,
        required: [true, 'City is required'],
        trim: true
    },
    areaSqFt: {
        type: Number,
        required: [true, 'Area is required'],
        min: [1, 'Area must be positive']
    },
    bedrooms: {
        type: Number,
        required: [true, 'Number of bedrooms is required'],
        min: [0, 'Bedrooms cannot be negative']
    },
    bathrooms: {
        type: Number,
        required: [true, 'Number of bathrooms is required'],
        min: [0, 'Bathrooms cannot be negative']
    },
    amenities: {
        type: String,
        required: [true, 'Amenities are required'],
        trim: true
    },
    furnished: {
        type: String,
        required: [true, 'Furnished status is required'],
        enum: ['Furnished', 'Semi-Furnished', 'Unfurnished'],
        trim: true
    },
    availableFrom: {
        type: Date,
        required: [true, 'Available from date is required']
    },
    listedBy: {
        type: String,
        required: [true, 'Listed by is required'],
        trim: true
    },
    tags: {
        type: String,
        required: [true, 'Tags are required'],
        trim: true
    },
    colorTheme: {
        type: String,
        required: [true, 'Color theme is required'],
        match: [/^#[0-9A-F]{6}$/i, 'Color theme must be a valid hex color']
    },
    rating: {
        type: Number,
        required: [true, 'Rating is required'],
        min: [0, 'Rating cannot be negative'],
        max: [5, 'Rating cannot exceed 5']
    },
    isVerified: {
        type: Boolean,
        required: [true, 'Verification status is required'],
        default: false
    },
    listingType: {
        type: String,
        required: [true, 'Listing type is required'],
        enum: ['rent', 'sale']
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Creator is required']
    }
}, {
    timestamps: true
});

// Indexes for better query performance
propertySchema.index({ state: 1, city: 1 });
propertySchema.index({ type: 1 });
propertySchema.index({ price: 1 });
propertySchema.index({ listingType: 1 });
propertySchema.index({ createdBy: 1 });
propertySchema.index({ isVerified: 1 });

// Text index for search functionality
propertySchema.index({
    title: 'text',
    type: 'text',
    state: 'text',
    city: 'text',
    amenities: 'text',
    tags: 'text'
});

export const Property = mongoose.model<IPropertyDocument>('Property', propertySchema);