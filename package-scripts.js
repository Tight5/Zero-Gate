const path = require('path');

module.exports = {
  scripts: {
    // Development scripts
    dev: 'NODE_ENV=development tsx server/index.ts',
    'dev:monitor': 'NODE_OPTIONS="--expose-gc" node scripts/auto-restart.js',
    'dev:health': 'node scripts/health-monitor.js',
    
    // Production scripts
    start: 'NODE_ENV=production tsx server/index.ts',
    'start:monitor': 'NODE_OPTIONS="--expose-gc --max-old-space-size=4096" node scripts/auto-restart.js',
    
    // Health and monitoring
    health: 'curl -s http://localhost:5000/health | jq .',
    metrics: 'curl -s http://localhost:5000/metrics | jq .',
    'health:continuous': 'node scripts/health-monitor.js',
    
    // Performance testing
    'test:load': 'node scripts/loadTest.js',
    'test:performance': 'node scripts/performance-monitor.js',
    
    // Database operations
    'db:push': 'drizzle-kit push',
    'db:studio': 'drizzle-kit studio',
    
    // Maintenance scripts
    'maintenance:gc': 'node -e "if (global.gc) { global.gc(); console.log(\'Garbage collection completed\'); } else { console.log(\'GC not available, start with --expose-gc\'); }"',
    'maintenance:memory': 'node -e "console.log(JSON.stringify(process.memoryUsage(), null, 2))"',
    
    // Testing
    test: 'jest',
    'test:watch': 'jest --watch',
    'test:coverage': 'jest --coverage',
    
    // Build and deployment
    build: 'vite build',
    preview: 'vite preview',
    
    // Linting and formatting
    lint: 'eslint . --ext .ts,.tsx,.js,.jsx',
    'lint:fix': 'eslint . --ext .ts,.tsx,.js,.jsx --fix',
    format: 'prettier --write .',
    
    // Type checking
    'type-check': 'tsc --noEmit',
    'type-check:watch': 'tsc --noEmit --watch'
  }
};