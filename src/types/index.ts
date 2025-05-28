export interface IUser {
  _id?: string;
  username: string;
  email: string;
  password: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IAuthRequest extends Request {
  user?: IUser;
}

export interface ISignupRequest {
  username: string;
  email: string;
  password: string;
}

export interface ILoginRequest {
  email: string;
  password: string;
}

export interface IAuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: Omit<IUser, 'password'>;
}
