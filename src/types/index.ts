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

// Add these interfaces to your existing src/types/index.ts file

export interface IProperty {
  _id?: string;
  id: string; // Property ID like "PROP1000"
  title: string;
  type: string;
  price: number;
  state: string;
  city: string;
  areaSqFt: number;
  bedrooms: number;
  bathrooms: number;
  amenities: string;
  furnished: string;
  availableFrom: Date;
  listedBy: string;
  tags: string;
  colorTheme: string;
  rating: number;
  isVerified: boolean;
  listingType: 'rent' | 'sale';
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICreatePropertyRequest {
  id: string;
  title: string;
  type: string;
  price: number;
  state: string;
  city: string;
  areaSqFt: number;
  bedrooms: number;
  bathrooms: number;
  amenities: string;
  furnished: string;
  availableFrom: Date;
  listedBy: string;
  tags: string;
  colorTheme: string;
  rating: number;
  isVerified: boolean;
  listingType: 'rent' | 'sale';
}

export interface IUpdatePropertyRequest {
  title?: string;
  type?: string;
  price?: number;
  state?: string;
  city?: string;
  areaSqFt?: number;
  bedrooms?: number;
  bathrooms?: number;
  amenities?: string;
  furnished?: string;
  availableFrom?: Date;
  listedBy?: string;
  tags?: string;
  colorTheme?: string;
  rating?: number;
  isVerified?: boolean;
  listingType?: 'rent' | 'sale';
}

export interface IPropertyQuery {
  page?: number;
  limit?: number;
  type?: string;
  state?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  furnished?: string;
  listingType?: 'rent' | 'sale';
  isVerified?: boolean;
  listedBy?: string;
  search?: string;
}

export interface IPropertyResponse {
  success: boolean;
  message: string;
  property?: IProperty;
  properties?: IProperty[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

// Add these interfaces to your existing src/types/index.ts file

export interface IFavorite {
  _id?: string;
  userId: string;
  propertyId: string;
  notes?: string;
  tags?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICreateFavoriteRequest {
  propertyId: string;
  notes?: string;
  tags?: string[];
}

export interface IUpdateFavoriteRequest {
  notes?: string;
  tags?: string[];
}

export interface IFavoriteQuery {
  page?: number;
  limit?: number;
  search?: string;
  tags?: string;
  sortBy?: 'newest' | 'oldest' | 'property_name';
}

export interface IFavoriteResponse {
  success: boolean;
  message: string;
  favorite?: IFavorite & {
    property?: IProperty;
    user?: Omit<IUser, 'password'>;
  };
  favorites?: Array<IFavorite & {
    property?: IProperty;
    user?: Omit<IUser, 'password'>;
  }>;
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}