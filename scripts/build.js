#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, rmSync } from 'fs';
import path from 'path';

console.log('🚀 Starting Zero Gate ESO Platform build process...');

// Clean previous build
if (existsSync('dist')) {
  console.log('🧹 Cleaning previous build...');
  rmSync('dist', { recursive: true, force: true });
}

try {
  // Build frontend
  console.log('📦 Building frontend assets...');
  execSync('vite build', { 
    stdio: 'pipe',
    env: { ...process.env, NODE_ENV: 'production' }
  });
  console.log('✅ Frontend build completed');

  // Build backend
  console.log('🔧 Building backend server...');
  execSync('esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist --minify --sourcemap=false', {
    stdio: 'pipe'
  });
  console.log('✅ Backend build completed');

  // Copy package.json for production
  console.log('📋 Preparing production package.json...');
  execSync('cp package.json dist/');
  
  console.log('🎉 Build completed successfully!');
  console.log('📁 Output directory: dist/');
  console.log('🚀 Ready for deployment');

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}