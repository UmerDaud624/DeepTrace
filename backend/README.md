# DeepTrace Backend API

Backend API server for the DeepTrace deepfake detection system built with Node.js, Express, and MySQL.

## Features

- 🔐 JWT Authentication (signup/signin)
- 📁 File Upload (images, videos, audio)
- 🤖 Deepfake Analysis (mock implementation ready for AI integration)
- 👤 User Profile Management
- 📊 Analysis History
- 🔒 Security Middleware (Helmet, CORS, Rate Limiting)
- 📝 Request Logging
- 🗄️ MySQL Database Integration

## Quick Start

### Prerequisites

- Node.js 18+ 
- MySQL database (using Clever Cloud)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
# Copy the example and edit with your values
cp .env.example .env
```

3. Set up database tables:
```bash
node scripts/setup-database.js
```

4. Start development server:
```bash
npm run dev
```

The server will start on `http://localhost:5000`

## API Endpoints

### Health Check
- `GET /api/health` - Server health status

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/signin` - User login

### User Management
- `GET /api/users/profile` - Get user profile (protected)
- `PUT /api/users/profile` - Update user profile (protected)
- `GET /api/users/history` - Get analysis history (protected)

### File Upload
- `POST /api/upload` - Upload file for analysis (protected)
- `GET /api/upload/:id` - Get upload details (protected)
- `DELETE /api/upload/:id` - Delete uploaded file (protected)

### Analysis
- `POST /api/analysis/analyze` - Analyze uploaded file (protected)
- `GET /api/analysis/:id` - Get analysis result (protected)
- `GET /api/analysis` - Get all user analyses (protected)

## Database Schema

The application uses the following main tables:
- `users` - User accounts
- `uploads` - File upload records
- `analyses` - Analysis results
- `reports` - Detailed analysis reports
- `user_sessions` - Session management
- `system_logs` - Audit trail

## Environment Variables

```env
# Database Configuration
MYSQL_HOST=your-mysql-host
MYSQL_PORT=3306
MYSQL_USER=your-mysql-user
MYSQL_PASSWORD=your-mysql-password
MYSQL_DATABASE=your-mysql-database

# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# CORS Configuration
FRONTEND_URL=http://localhost:3000

# File Upload Configuration
MAX_FILE_SIZE=50MB
UPLOAD_PATH=uploads/
```

## Security Features

- JWT token authentication
- Password hashing with bcrypt
- Rate limiting (100 requests per 15 minutes)
- CORS protection
- Helmet security headers
- Input validation
- File type restrictions
- File size limits

## Development

### Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `node scripts/setup-database.js` - Set up database tables

### Project Structure

```
backend/
├── config/
│   ├── database.js      # Database connection
│   └── env.js          # Environment configuration
├── middleware/
│   └── auth.js         # Authentication middleware
├── routes/
│   ├── auth.js         # Authentication routes
│   ├── users.js        # User management routes
│   ├── upload.js       # File upload routes
│   └── analysis.js     # Analysis routes
├── scripts/
│   └── setup-database.js # Database setup script
├── database/
│   └── schema.sql      # Database schema
├── uploads/            # File upload directory
├── server.js           # Main server file
└── package.json        # Dependencies and scripts
```

## Integration with AI Models

The analysis endpoints are currently using mock data. To integrate with actual AI models:

1. Replace the `simulateAnalysis` function in `routes/analysis.js`
2. Add your AI model dependencies to `package.json`
3. Configure model paths and parameters in the environment variables
4. Update the analysis logic to call your trained models

## Production Deployment

1. Set `NODE_ENV=production`
2. Use a strong `JWT_SECRET`
3. Configure proper CORS origins
4. Set up SSL/HTTPS
5. Use a process manager like PM2
6. Set up proper logging and monitoring
7. Configure database connection pooling
8. Set up file storage (AWS S3, etc.) for production

## Testing

Test the API endpoints using the health check:
```bash
curl http://localhost:5000/api/health
```

Example signup request:
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","firstName":"John","lastName":"Doe"}'
```
