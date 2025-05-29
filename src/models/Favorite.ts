// src/models/Favorite.ts
import mongoose, { Schema, Document, Types } from 'mongoose';
import { IFavorite } from '../types/index';

interface IFavoriteDocument extends Omit<IFavorite, '_id' | 'userId' | 'propertyId'>, Document {
    _id: Types.ObjectId;
    userId: Types.ObjectId;
    propertyId: Types.ObjectId;
}

const favoriteSchema = new Schema<IFavoriteDocument>({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required']
    },
    propertyId: {
        type: Schema.Types.ObjectId,
        ref: 'Property',
        required: [true, 'Property ID is required']
    },
    notes: {
        type: String,
        trim: true,
        maxlength: [500, 'Notes cannot exceed 500 characters']
    },
    tags: {
        type: [String],
        default: []
    }
}, {
    timestamps: true
});

// Compound index to ensure a user can't favorite the same property twice
favoriteSchema.index({ userId: 1, propertyId: 1 }, { unique: true });

// Index for better query performance
favoriteSchema.index({ userId: 1 });
favoriteSchema.index({ propertyId: 1 });
favoriteSchema.index({ createdAt: -1 });

export const Favorite = mongoose.model<IFavoriteDocument>('Favorite', favoriteSchema);