#!/usr/bin/env node

import http from 'http';
import { Pool } from '@neondatabase/serverless';

const HEALTH_CHECK_TIMEOUT = 5000;
const DB_CONNECTION_TIMEOUT = 3000;

async function checkServer() {
  return new Promise((resolve, reject) => {
    const req = http.get('http://localhost:5000/api/dashboard/metrics', {
      timeout: HEALTH_CHECK_TIMEOUT
    }, (res) => {
      if (res.statusCode === 200) {
        resolve('Server responding');
      } else {
        reject(new Error(`Server returned status: ${res.statusCode}`));
      }
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Server health check timeout'));
    });
  });
}

async function checkDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable not set');
  }

  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: DB_CONNECTION_TIMEOUT
  });

  try {
    const result = await pool.query('SELECT 1 as healthy');
    await pool.end();
    return 'Database connection successful';
  } catch (error) {
    await pool.end();
    throw new Error(`Database connection failed: ${error.message}`);
  }
}

async function checkEnvironment() {
  const required = ['DATABASE_URL', 'SESSION_SECRET', 'REPL_ID', 'REPLIT_DOMAINS'];
  const missing = required.filter(env => !process.env[env]);
  
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
  
  return 'Environment variables configured';
}

async function runHealthChecks() {
  console.log('Zero Gate ESO Platform - Health Check');
  console.log('=====================================');

  const checks = [
    { name: 'Environment', fn: checkEnvironment },
    { name: 'Database', fn: checkDatabase },
    { name: 'Server', fn: checkServer }
  ];

  let allPassed = true;

  for (const check of checks) {
    try {
      const result = await check.fn();
      console.log(`✓ ${check.name}: ${result}`);
    } catch (error) {
      console.log(`✗ ${check.name}: ${error.message}`);
      allPassed = false;
    }
  }

  console.log('=====================================');
  
  if (allPassed) {
    console.log('All health checks passed - System ready');
    process.exit(0);
  } else {
    console.log('Health checks failed - System not ready');
    process.exit(1);
  }
}

runHealthChecks().catch(error => {
  console.error('Health check error:', error.message);
  process.exit(1);
});