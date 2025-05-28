import { Request, Response } from 'express';
import { User } from '../models/User';
import { hashPassword, comparePassword } from '../utils/hashPassword';
import { generateToken } from '../utils/generateToken';
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
      const token = generateToken({ ...user.toJSON(), _id: user._id.toString() });

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        token,
        user: { ...user.toJSON(), _id: user._id.toString() }
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
      const token = generateToken({ ...user.toJSON(), _id: user._id.toString() });

      res.json({
        success: true,
        message: 'Login successful',
        token,
        user: { ...user.toJSON(), _id: user._id.toString() }
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
      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        message: 'Profile retrieved successfully',
        user: { ...user.toJSON(), _id: user._id.toString() }
      });

    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}