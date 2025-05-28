import jwt, { SignOptions } from 'jsonwebtoken';
import { IUser } from '../types';

export const generateToken = (user: IUser): string => {
  const payload = {
    id: user._id,
    email: user.email,
    username: user.username
  };

  const secret = process.env.JWT_SECRET || 'your-secret-key';
  const options: SignOptions = {
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as unknown as import('ms').StringValue
  };

  return jwt.sign(payload, secret, options);
};

export const verifyToken = (token: string): any => {
  const secret = process.env.JWT_SECRET || 'your-secret-key';
  return jwt.verify(token, secret);
};