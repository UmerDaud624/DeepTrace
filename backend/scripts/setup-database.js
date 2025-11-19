import fs from 'fs';
import path from 'path';
import { executeQuery, testConnection } from '../config/database.js';

const setupDatabase = async () => {
  try {
    console.log('🔄 Setting up database...');

    // Test connection first
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error('❌ Cannot connect to database');
      process.exit(1);
    }

    // Read schema file
    const schemaPath = path.join(process.cwd(), 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Split schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    console.log(`📄 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        await executeQuery(statement);
        console.log(`✅ Statement ${i + 1}/${statements.length} executed successfully`);
      } catch (error) {
        console.error(`❌ Error executing statement ${i + 1}:`, error.message);
        console.error('Statement:', statement);
      }
    }

    console.log('🎉 Database setup completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
};

setupDatabase();
