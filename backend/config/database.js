import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Database configuration
const dbConfig = {
  host: process.env.MYSQL_ADDON_HOST || process.env.MYSQL_HOST,
  port: process.env.MYSQL_ADDON_PORT || process.env.MYSQL_PORT || 3306,
  user: process.env.MYSQL_ADDON_USER || process.env.MYSQL_USER,
  password: process.env.MYSQL_ADDON_PASSWORD || process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_ADDON_DB || process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection
export const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

// Execute query helper
export const executeQuery = async (query, params = []) => {
  try {
    const [results] = await pool.execute(query, params);
    return results;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

export default pool;
