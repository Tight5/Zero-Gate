#!/usr/bin/env node

/**
 * Startup script for Zero Gate ESO Platform with JWT Authentication
 * Runs Express.js server (port 5000) and FastAPI JWT service (port 8000) concurrently
 */

const { spawn } = require('child_process');
const path = require('path');

class ServiceManager {
  constructor() {
    this.services = new Map();
    this.isShuttingDown = false;
  }

  startService(name, command, args, options = {}) {
    console.log(`🚀 Starting ${name}...`);
    
    const service = spawn(command, args, {
      stdio: 'pipe',
      cwd: process.cwd(),
      env: { ...process.env, ...options.env },
      ...options
    });

    // Handle stdout
    service.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        console.log(`[${name}] ${output}`);
      }
    });

    // Handle stderr
    service.stderr.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        console.error(`[${name}] ${output}`);
      }
    });

    // Handle service exit
    service.on('close', (code) => {
      if (!this.isShuttingDown) {
        console.log(`❌ ${name} exited with code ${code}`);
        this.shutdown();
      }
    });

    service.on('error', (error) => {
      console.error(`❌ ${name} error:`, error.message);
      this.shutdown();
    });

    this.services.set(name, service);
    console.log(`✅ ${name} started (PID: ${service.pid})`);
  }

  shutdown() {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    console.log('\n🔄 Shutting down services...');

    for (const [name, service] of this.services) {
      if (service && !service.killed) {
        console.log(`🛑 Stopping ${name}...`);
        service.kill('SIGTERM');
        
        // Force kill after 5 seconds
        setTimeout(() => {
          if (!service.killed) {
            console.log(`⚡ Force killing ${name}...`);
            service.kill('SIGKILL');
          }
        }, 5000);
      }
    }

    setTimeout(() => {
      console.log('👋 All services stopped');
      process.exit(0);
    }, 1000);
  }

  async start() {
    console.log('🌟 Zero Gate ESO Platform - JWT Authentication Setup');
    console.log('=' * 60);

    // Set environment variables for JWT authentication
    const jwtEnv = {
      JWT_SECRET_KEY: process.env.JWT_SECRET_KEY || 'your-super-secret-jwt-key-change-in-production',
      FASTAPI_PORT: '8000',
      FASTAPI_HOST: '0.0.0.0',
      FRONTEND_URL: 'http://localhost:5000',
      SMTP_SERVER: process.env.SMTP_SERVER || 'localhost',
      SMTP_PORT: process.env.SMTP_PORT || '587',
      FROM_EMAIL: process.env.FROM_EMAIL || 'noreply@zerogateeso.com'
    };

    // Start Express.js server (existing)
    this.startService(
      'Express.js',
      'npm',
      ['run', 'dev'],
      { env: {} }
    );

    // Wait a moment before starting FastAPI
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Start FastAPI JWT authentication service
    this.startService(
      'FastAPI-JWT',
      'python',
      ['server/fastapi_app.py'],
      { env: jwtEnv }
    );

    // Display service information
    setTimeout(() => {
      console.log('\n📡 Services Running:');
      console.log('==================');
      console.log('🌐 Express.js Server: http://localhost:5000');
      console.log('   - Main application and existing auth');
      console.log('   - Dashboard, sponsors, grants, relationships');
      console.log('');
      console.log('🔐 FastAPI JWT Service: http://localhost:8000');
      console.log('   - JWT authentication endpoints');
      console.log('   - API documentation: http://localhost:8000/auth-docs');
      console.log('   - Role-based permissions testing');
      console.log('');
      console.log('🧪 Test JWT Authentication:');
      console.log('   python scripts/test-jwt-auth.py');
      console.log('');
      console.log('📚 Available JWT Endpoints:');
      console.log('   POST /auth/login - User login with JWT tokens');
      console.log('   POST /auth/refresh - Refresh access token');
      console.log('   POST /auth/logout - User logout');
      console.log('   GET  /auth/me - Current user information');
      console.log('   POST /auth/password-reset/request - Request password reset');
      console.log('   POST /auth/password-reset/confirm - Confirm password reset');
      console.log('   POST /auth/change-password - Change user password');
      console.log('');
      console.log('🛡️  Role-based Test Endpoints:');
      console.log('   GET  /auth/test/viewer - Viewer role test');
      console.log('   GET  /auth/test/user - User role test');
      console.log('   GET  /auth/test/manager - Manager role test');
      console.log('   GET  /auth/test/admin - Admin role test');
      console.log('');
      console.log('Press Ctrl+C to stop all services');
    }, 3000);
  }
}

// Handle graceful shutdown
const serviceManager = new ServiceManager();

process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  serviceManager.shutdown();
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  serviceManager.shutdown();
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  serviceManager.shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  serviceManager.shutdown();
});

// Start services
serviceManager.start().catch(error => {
  console.error('❌ Failed to start services:', error);
  process.exit(1);
});