import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Environment configuration
export const config = {
  // Server configuration
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || "development",

  // Frontend configuration
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5173",

  // JWT configuration
  JWT_SECRET: process.env.JWT_SECRET || "qazxwedcuiejkrbcvhjgabuidiexdi",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "24h",

  // Database configuration (already handled in database.js)
  MYSQL_HOST: process.env.MYSQL_HOST || "localhost",
  MYSQL_PORT: process.env.MYSQL_PORT || 3306,
  MYSQL_USER: process.env.MYSQL_USER || "root",
  MYSQL_PASSWORD: process.env.MYSQL_PASSWORD || "",
  MYSQL_DATABASE: process.env.MYSQL_DATABASE || "deeptrace",

  // File upload configuration
  MAX_FILE_SIZE: process.env.MAX_FILE_SIZE || "50mb",
  UPLOAD_DIR: process.env.UPLOAD_DIR || "uploads",

  // Rate limiting
  RATE_LIMIT_WINDOW: process.env.RATE_LIMIT_WINDOW || 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX: process.env.RATE_LIMIT_MAX || 100,

  // Security
  CORS_ORIGIN:
    process.env.CORS_ORIGIN ||
    process.env.FRONTEND_URL ||
    "http://localhost:5173",
};

export default config;
