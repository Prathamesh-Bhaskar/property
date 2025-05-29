// src/controllers/authController.ts
import { Request, Response } from 'express';
import { User } from '../models/User';
import { hashPassword, comparePassword } from '../utils/hashPassword';
import { generateToken } from '../utils/generateToken';
import { CacheService } from '../cache/cacheService';
import { ISignupRequest, ILoginRequest, IAuthResponse } from '../types/index';

export class AuthController {
  static async signup(req: Request<{}, IAuthResponse, ISignupRequest>, res: Response<IAuthResponse>) {
    try {
      const { username, email, password } = req.body;

      // Validation
      if (!username || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'All fields are required'
        });
      }

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ email }, { username }]
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User with this email or username already exists'
        });
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Create user
      const user = new User({
        username,
        email,
        password: hashedPassword
      });

      await user.save();

      // Generate token
      const userForToken = { ...user.toJSON(), _id: user._id.toString() };
      const token = generateToken(userForToken);

      const userResponse = { ...user.toJSON(), _id: user._id.toString() };

      // Cache user profile (without password)
      await CacheService.cacheUserProfile(userResponse);

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        token,
        user: userResponse
      });

    } catch (error: any) {
      console.error('Signup error:', error);

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

  static async login(req: Request<{}, IAuthResponse, ILoginRequest>, res: Response<IAuthResponse>) {
    try {
      const { email, password } = req.body;

      // Validation
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      // Find user
      const user = await User.findOne({ email }).select('+password');

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Verify password
      const isPasswordValid = await comparePassword(password, user.password);

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Generate token
      const userForToken = { ...user.toJSON(), _id: user._id.toString() };
      const token = generateToken(userForToken);

      const userResponse = { ...user.toJSON(), _id: user._id.toString() };

      // Cache user profile (without password)
      await CacheService.cacheUserProfile(userResponse);

      res.json({
        success: true,
        message: 'Login successful',
        token,
        user: userResponse
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async getProfile(req: any, res: Response) {
    try {
      const userId = req.user.id;

      // Try to get from cache first
      const cachedUser = await CacheService.getCachedUserProfile(userId);
      if (cachedUser) {
        console.log('Returning cached user profile');
        return res.json({
          success: true,
          message: 'Profile retrieved successfully',
          user: cachedUser
        });
      }

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const userResponse = { ...user.toJSON(), _id: user._id.toString() };

      // Cache the user profile
      await CacheService.cacheUserProfile(userResponse);

      res.json({
        success: true,
        message: 'Profile retrieved successfully',
        user: userResponse
      });

    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // New method to update user profile (with cache invalidation)
  static async updateProfile(req: any, res: Response) {
    try {
      const userId = req.user.id;
      const { username, email } = req.body;

      // Validation
      if (!username && !email) {
        return res.status(400).json({
          success: false,
          message: 'At least one field (username or email) is required'
        });
      }

      // Check if username or email is already taken by another user
      const existingUser = await User.findOne({
        _id: { $ne: userId },
        $or: [
          ...(username ? [{ username }] : []),
          ...(email ? [{ email }] : [])
        ]
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Username or email is already taken'
        });
      }

      // Update user
      const updateData: any = {};
      if (username) updateData.username = username;
      if (email) updateData.email = email;

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        updateData,
        { new: true, runValidators: true }
      );

      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const userResponse = { ...updatedUser.toJSON(), _id: updatedUser._id.toString() };

      // Update cache
      await CacheService.cacheUserProfile(userResponse);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        user: userResponse
      });

    } catch (error: any) {
      console.error('Update profile error:', error);

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

  // New method to change password (with cache invalidation)
  static async changePassword(req: any, res: Response) {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;

      // Validation
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password and new password are required'
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 6 characters long'
        });
      }

      // Find user with password
      const user = await User.findById(userId).select('+password');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await comparePassword(currentPassword, user.password);

      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Hash new password
      const hashedNewPassword = await hashPassword(newPassword);

      // Update password
      await User.findByIdAndUpdate(userId, { password: hashedNewPassword });

      // Invalidate user cache (force fresh data on next request)
      await CacheService.invalidateUserProfile(userId);

      res.json({
        success: true,
        message: 'Password changed successfully'
      });

    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}