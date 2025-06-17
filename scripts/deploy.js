#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

console.log('🚀 Zero Gate ESO Platform - Production Deployment');

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

// Create optimized production package.json
const prodPackage = {
  name: packageJson.name,
  version: packageJson.version,
  type: packageJson.type,
  scripts: {
    start: "NODE_ENV=production node index.js"
  },
  dependencies: {
    // Core runtime dependencies only
    "@neondatabase/serverless": packageJson.dependencies["@neondatabase/serverless"],
    "express": packageJson.dependencies.express,
    "express-session": packageJson.dependencies["express-session"],
    "connect-pg-simple": packageJson.dependencies["connect-pg-simple"],
    "passport": packageJson.dependencies.passport,
    "openid-client": packageJson.dependencies["openid-client"],
    "drizzle-orm": packageJson.dependencies["drizzle-orm"],
    "zod": packageJson.dependencies.zod,
    "ws": packageJson.dependencies.ws
  }
};

try {
  // Environment validation
  console.log('🔍 Validating environment...');
  const requiredEnvVars = ['DATABASE_URL', 'SESSION_SECRET', 'REPL_ID', 'REPLIT_DOMAINS'];
  const missingVars = requiredEnvVars.filter(env => !process.env[env]);
  
  if (missingVars.length > 0) {
    console.error(`❌ Missing environment variables: ${missingVars.join(', ')}`);
    process.exit(1);
  }

  // Database schema check
  console.log('🗄️  Verifying database schema...');
  execSync('npm run db:push', { stdio: 'pipe' });

  // Production build
  console.log('📦 Creating production build...');
  execSync('node scripts/build.js', { stdio: 'inherit' });

  // Optimize production package.json
  writeFileSync('dist/package.json', JSON.stringify(prodPackage, null, 2));

  console.log('✅ Deployment package ready');
  console.log('📁 Deploy from: dist/ directory');
  console.log('🎯 Entry point: node index.js');

} catch (error) {
  console.error('❌ Deployment preparation failed:', error.message);
  process.exit(1);
}