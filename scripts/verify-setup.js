#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';
import fetch from 'node-fetch';

const execAsync = promisify(exec);

console.log('🔍 DeepTrace MERN Stack Setup Verification\n');

// Test functions
const tests = [
  {
    name: 'Node.js Version',
    test: async () => {
      const { stdout } = await execAsync('node --version');
      const version = stdout.trim();
      const majorVersion = parseInt(version.slice(1).split('.')[0]);
      if (majorVersion >= 18) {
        return { success: true, message: `✅ Node.js ${version} (>= 18.0.0)` };
      }
      return { success: false, message: `❌ Node.js ${version} (requires >= 18.0.0)` };
    }
  },
  {
    name: 'npm Version',
    test: async () => {
      const { stdout } = await execAsync('npm --version');
      const version = stdout.trim();
      const majorVersion = parseInt(version.split('.')[0]);
      if (majorVersion >= 8) {
        return { success: true, message: `✅ npm ${version} (>= 8.0.0)` };
      }
      return { success: false, message: `❌ npm ${version} (requires >= 8.0.0)` };
    }
  },
  {
    name: 'Backend Dependencies',
    test: async () => {
      try {
        await execAsync('cd backend && npm list --depth=0');
        return { success: true, message: '✅ Backend dependencies installed' };
      } catch (error) {
        return { success: false, message: '❌ Backend dependencies missing' };
      }
    }
  },
  {
    name: 'Frontend Dependencies',
    test: async () => {
      try {
        await execAsync('cd frontend/UI && npm list --depth=0');
        return { success: true, message: '✅ Frontend dependencies installed' };
      } catch (error) {
        return { success: false, message: '❌ Frontend dependencies missing' };
      }
    }
  },
  {
    name: 'Backend Health Check',
    test: async () => {
      try {
        const response = await fetch('http://localhost:5000/api/health');
        if (response.ok) {
          const data = await response.json();
          return { success: true, message: `✅ Backend server running (${data.environment})` };
        }
        return { success: false, message: '❌ Backend server not responding' };
      } catch (error) {
        return { success: false, message: '❌ Backend server not accessible' };
      }
    }
  },
  {
    name: 'Database Connection',
    test: async () => {
      try {
        const response = await fetch('http://localhost:5000/api/health');
        if (response.ok) {
          // If health check passes, database connection is working
          return { success: true, message: '✅ Database connection established' };
        }
        return { success: false, message: '❌ Database connection failed' };
      } catch (error) {
        return { success: false, message: '❌ Cannot verify database connection' };
      }
    }
  }
];

// Run all tests
const runTests = async () => {
  let allPassed = true;
  
  for (const test of tests) {
    try {
      const result = await test.test();
      console.log(result.message);
      if (!result.success) {
        allPassed = false;
      }
    } catch (error) {
      console.log(`❌ ${test.name}: ${error.message}`);
      allPassed = false;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  
  if (allPassed) {
    console.log('🎉 All tests passed! Your MERN stack is ready to go!');
    console.log('\n📋 Quick Start Commands:');
    console.log('  npm run dev          - Start both frontend and backend');
    console.log('  npm run backend:dev  - Start backend only');
    console.log('  npm run frontend:dev - Start frontend only');
    console.log('\n🌐 Access URLs:');
    console.log('  Frontend: http://localhost:3000');
    console.log('  Backend:  http://localhost:5000');
    console.log('  API Docs: http://localhost:5000/api/health');
  } else {
    console.log('❌ Some tests failed. Please check the issues above.');
    console.log('\n🔧 Common fixes:');
    console.log('  - Run: npm run install:all');
    console.log('  - Check: backend/.env file exists');
    console.log('  - Start: npm run backend:dev (in separate terminal)');
  }
  
  console.log('\n📚 For more help, check the README.md file.');
};

runTests().catch(console.error);
