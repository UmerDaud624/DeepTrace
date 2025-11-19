# DeepTrace - AI-Powered Deepfake Detection System

A comprehensive MERN stack application for detecting deepfakes in images, videos, and audio files using advanced AI algorithms.

## 🚀 Features

- **Multi-Modal Detection**: Support for image, video, and audio deepfake detection
- **Real-time Analysis**: Fast processing with detailed confidence scores
- **User Authentication**: Secure login/registration system
- **Analysis History**: Track and review past analyses
- **Detailed Reports**: Comprehensive analysis reports with technical details
- **Modern UI**: Beautiful, responsive interface built with React and Material Tailwind

## 🛠️ Tech Stack

### Frontend

- **React 18** - Modern React with hooks
- **Vite** - Fast build tool and development server
- **Material Tailwind** - Beautiful UI components
- **React Router** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework

### Backend

- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **MySQL** - Relational database (Clever Cloud hosted)
- **JWT** - JSON Web Tokens for authentication
- **Multer** - File upload handling
- **bcryptjs** - Password hashing

### Database

- **MySQL 8.0** - Hosted on Clever Cloud
- **Connection Pooling** - Optimized database connections
- **Migrations** - Database schema management

## 📋 Prerequisites

- Node.js (v18.0.0 or higher)
- npm (v8.0.0 or higher)
- MySQL database (provided via Clever Cloud)

## 🔧 Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd DeepTrace
```

### 2. Install All Dependencies

```bash
npm run install:all
```

### 3. Environment Configuration

Create a `.env` file in the `backend` directory:

```bash
cd backend
cp .env.example .env
```

The `.env` file should contain:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# CORS Configuration
FRONTEND_URL=http://localhost:3000

# File Upload Configuration
MAX_FILE_SIZE=50MB
UPLOAD_PATH=uploads/
```

### 4. Database Setup

```bash
npm run backend:setup
```

### 5. Start Development Servers

```bash
# Start both frontend and backend simultaneously
npm run dev

# Or start them separately:
npm run backend:dev  # Backend on http://localhost:5000
npm run frontend:dev # Frontend on http://localhost:3000
```

## 📁 Project Structure

```
DeepTrace/
├── backend/                 # Node.js/Express backend
│   ├── config/             # Database and environment configuration
│   ├── database/           # Database schema and migrations
│   ├── middleware/         # Express middleware (auth, validation)
│   ├── routes/            # API route handlers
│   ├── scripts/           # Utility scripts (database setup)
│   ├── uploads/           # File upload directory
│   └── server.js          # Main server file
├── frontend/UI/           # React frontend
│   ├── public/           # Static assets
│   ├── src/
│   │   ├── components/   # Reusable React components
│   │   ├── contexts/     # React contexts (Auth, Theme)
│   │   ├── pages/        # Page components
│   │   ├── services/     # API service functions
│   │   ├── utils/        # Utility functions
│   │   └── widgets/      # UI widgets and layouts
│   └── package.json
├── articles/             # Research papers and documentation
└── package.json         # Root package.json for scripts
```

## 🔌 API Endpoints

### Authentication

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### File Upload

- `POST /api/upload` - Upload file for analysis
- `GET /api/upload/history` - Get upload history
- `DELETE /api/upload/:id` - Delete uploaded file

### Analysis

- `POST /api/analysis/analyze` - Start deepfake analysis
- `GET /api/analysis/:id` - Get analysis result
- `GET /api/analysis/history` - Get analysis history
- `POST /api/analysis/:id/report` - Generate detailed report

### Health Check

- `GET /api/health` - Server health status

## 🚦 Available Scripts

### Root Level

- `npm run dev` - Start both frontend and backend in development mode
- `npm run install:all` - Install dependencies for all projects
- `npm run backend:dev` - Start backend development server
- `npm run frontend:dev` - Start frontend development server
- `npm run backend:setup` - Initialize database schema

### Backend (`cd backend`)

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `node scripts/setup-database.js` - Setup database tables

### Frontend (`cd frontend/UI`)

- `npm run dev` - Start Vite development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## 🔒 Security Features

- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - bcrypt for secure password storage
- **Rate Limiting** - Prevent API abuse
- **CORS Protection** - Configured for secure cross-origin requests
- **Input Validation** - Server-side validation for all inputs
- **File Upload Security** - Secure file handling with type validation

## 🗄️ Database Schema

### Users Table

- User authentication and profile information
- Encrypted password storage
- Timestamps for account creation and updates

### Uploads Table

- File metadata and storage information
- Links to user accounts
- File type and size tracking

### Analyses Table

- Deepfake analysis results
- Confidence scores and processing metrics
- JSON storage for detailed analysis data

### Reports Table

- Detailed analysis reports
- User-generated report data
- Links to analyses and users

## 🔧 Development

### Adding New Features

1. Create API endpoints in `backend/routes/`
2. Add database migrations if needed
3. Create frontend components in `frontend/UI/src/`
4. Update API service functions in `frontend/UI/src/services/api.js`

### Database Changes

1. Update schema in `backend/database/schema.sql`
2. Run `npm run backend:setup` to apply changes
3. Update API endpoints to use new schema

## 🚀 Deployment

### Backend Deployment

- Ensure all environment variables are set in production
- Use `npm start` for production server
- Configure reverse proxy (nginx) if needed

### Frontend Deployment

- Run `npm run build` in `frontend/UI/`
- Serve the `dist/` directory with a web server
- Configure environment variables for production API URL

## 📝 Environment Variables

### Backend (.env)

### Frontend (.env)

```env
VITE_API_URL=https://your-backend-domain.com/api
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:

- Create an issue in the repository
- Check the documentation in the `articles/` directory
- Review the API documentation above

## 🙏 Acknowledgments

- Research papers in the `articles/` directory
- Material Tailwind for UI components
- Clever Cloud for database hosting
- Open source community for various packages and tools
