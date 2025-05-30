# Property Listing System Backend

A comprehensive backend system for managing property listings with advanced features including user authentication, property CRUD operations, favorites management, and Redis caching for optimal performance.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [API Endpoints](#api-endpoints)
- [Authentication](#authentication)
- [Caching Strategy](#caching-strategy)
- [Data Models](#data-models)
- [Error Handling](#error-handling)
- [Performance Optimizations](#performance-optimizations)
- [Deployment](#deployment)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

## Features

### Core Functionality
- **Property Management**: Complete CRUD operations for property listings
- **User Authentication**: Secure registration and login with JWT tokens
- **Favorites System**: Users can save and manage favorite properties
- **Advanced Search**: Multi-parameter filtering and text search capabilities
- **User Authorization**: Property ownership-based access control
- **Redis Caching**: High-performance caching for frequently accessed data

### Advanced Features
- **Rate Limiting**: Protection against API abuse
- **Data Validation**: Comprehensive input validation and sanitization
- **Error Handling**: Robust error management with detailed responses
- **Security**: Helmet.js security headers and CORS configuration
- **Monitoring**: Health checks and cache statistics endpoints

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Caching**: Redis with ioredis client
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: bcryptjs for password hashing, Helmet.js
- **Validation**: Built-in Mongoose validation
- **Development**: TypeScript for type safety

## Prerequisites

Before running this application, ensure you have the following installed:

- Node.js (v16.0.0 or higher)
- npm or yarn package manager
- MongoDB (v5.0 or higher)
- Redis (v6.0 or higher)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd property-listing-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the TypeScript project**
   ```bash
   npm run build
   ```

## Environment Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/property-listing

# Redis Configuration
REDIS_URL=redis://localhost:6379

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
```

### Environment Variables Description

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port number | 3000 |
| `MONGODB_URI` | MongoDB connection string | Required |
| `REDIS_URL` | Redis connection URL | Required |
| `JWT_SECRET` | Secret key for JWT token signing | Required |
| `JWT_EXPIRES_IN` | JWT token expiration time | 7d |
| `CORS_ORIGIN` | Allowed CORS origin | http://localhost:3000 |

## Database Setup

### MongoDB Setup

1. **Install MongoDB** following the official documentation
2. **Start MongoDB service**
3. **Create database** (will be created automatically on first connection)

### CSV Data Import

The system supports importing property data from the provided CSV file. Use the following steps:

1. Download the dataset from: `https://cdn2.gro.care/db424fd9fb74_1748258398689.csv`
2. Use the import script or API endpoint to load data into MongoDB

## Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

### Using Docker (Optional)
```bash
docker-compose up
```

The server will start on `http://localhost:3000` (or the port specified in your .env file).

## API Endpoints

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/signup` | Register new user | No |
| POST | `/api/auth/login` | User login | No |
| GET | `/api/auth/profile` | Get user profile | Yes |

### Property Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/properties` | Get all properties (with filtering) | No |
| GET | `/api/properties/:id` | Get property by ID | No |
| POST | `/api/properties` | Create new property | Yes |
| PUT | `/api/properties/:id` | Update property (owner only) | Yes |
| DELETE | `/api/properties/:id` | Delete property (owner only) | Yes |
| GET | `/api/properties/user/my-properties` | Get user's properties | Yes |

### Favorites Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/favorites` | Get user's favorites | Yes |
| POST | `/api/favorites` | Add property to favorites | Yes |
| PUT | `/api/favorites/:id` | Update favorite notes/tags | Yes |
| DELETE | `/api/favorites/property/:propertyId` | Remove from favorites | Yes |
| GET | `/api/favorites/check/:propertyId` | Check if property is favorited | Yes |

### Cache Management Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/cache/stats` | Get cache statistics | Yes |
| DELETE | `/api/cache/clear` | Clear all cache | Yes |
| GET | `/api/cache/health` | Check cache health | Yes |

### Utility Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Server health check |
| GET | `/api/status` | System status |

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Token Structure
```json
{
  "id": "user_id",
  "email": "user@example.com",
  "username": "username",
  "iat": 1234567890,
  "exp": 1234567890
}
```

## Caching Strategy

### Redis Implementation
- **Property Caching**: Individual properties cached for 15 minutes
- **Search Results**: Search queries cached for 5 minutes
- **User Data**: User profiles cached for 30 minutes
- **Favorites**: User favorites cached for 10 minutes

### Cache Invalidation
- **Property Updates**: Invalidates related property and search caches
- **User Actions**: Invalidates user-specific caches
- **Automatic Expiry**: TTL-based cache expiration

## Data Models

### User Model
```typescript
interface IUser {
  _id: string;
  username: string;
  email: string;
  password: string; // hashed
  createdAt: Date;
  updatedAt: Date;
}
```

### Property Model
```typescript
interface IProperty {
  _id: string;
  id: string; // Property ID (e.g., PROP1000)
  title: string;
  type: string;
  price: number;
  state: string;
  city: string;
  areaSqFt: number;
  bedrooms: number;
  bathrooms: number;
  amenities: string;
  furnished: 'Furnished' | 'Semi-Furnished' | 'Unfurnished';
  availableFrom: Date;
  listedBy: string;
  tags: string;
  colorTheme: string;
  rating: number;
  isVerified: boolean;
  listingType: 'rent' | 'sale';
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
```

### Favorite Model
```typescript
interface IFavorite {
  _id: string;
  userId: ObjectId;
  propertyId: ObjectId;
  notes?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

## Error Handling

The API implements comprehensive error handling with standardized response formats:

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {}
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "errors": [] // Optional validation errors
}
```

### HTTP Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `429`: Too Many Requests
- `500`: Internal Server Error

## Performance Optimizations

### Database Optimizations
- **Indexes**: Strategic indexing on frequently queried fields
- **Aggregation**: Efficient data aggregation for complex queries
- **Pagination**: Limit data transfer with pagination

### Caching Strategy
- **Multi-level Caching**: Application and database-level caching
- **Cache Warming**: Proactive caching of frequently accessed data
- **Smart Invalidation**: Targeted cache invalidation strategies

### Security Measures
- **Rate Limiting**: Prevent API abuse
- **Input Validation**: Comprehensive data validation
- **Password Hashing**: bcrypt with salt rounds
- **JWT Security**: Secure token implementation

## Deployment

### Environment Preparation
1. Set up production MongoDB instance
2. Configure Redis instance
3. Set production environment variables
4. Build the application

### Deployment Platforms

#### Render
```bash
# Build command
npm run build

# Start command
npm start
```

#### Vercel
```bash
# Configure vercel.json for API routes
# Deploy using Vercel CLI
```

#### Docker Deployment
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Testing

### Running Tests
```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# Test coverage
npm run test:coverage
```

### Test Structure
- **Unit Tests**: Individual function testing
- **Integration Tests**: API endpoint testing
- **Performance Tests**: Load and stress testing

## API Documentation

For detailed API documentation with request/response examples, refer to the Postman collection or Swagger documentation (if implemented).

## Monitoring and Logs

### Health Monitoring
- Server health endpoint: `/health`
- Cache health endpoint: `/api/cache/health`
- System status endpoint: `/api/status`

### Logging
- Error logging with stack traces
- Performance monitoring
- Cache hit/miss statistics

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Standards
- Follow TypeScript best practices
- Maintain consistent code formatting
- Write comprehensive tests
- Update documentation as needed

## Security Considerations

- Keep dependencies updated
- Use environment variables for sensitive data
- Implement proper input validation
- Follow OWASP security guidelines
- Regular security audits

## Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   - Verify MongoDB is running
   - Check connection string in .env

2. **Redis Connection Failed**
   - Ensure Redis server is running
   - Verify Redis URL configuration

3. **JWT Token Issues**
   - Check JWT_SECRET configuration
   - Verify token expiration settings

4. **Performance Issues**
   - Monitor cache hit rates
   - Check database query performance
   - Review server resource usage

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Refer to the documentation

---

**Note**: This is a backend API service. For the complete application experience, integrate with a frontend application that consumes these APIs.