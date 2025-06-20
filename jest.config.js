export default {
  // Test environment configuration
  testEnvironment: 'jsdom',
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Module name mapping for path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/client/src/$1',
    '^@components/(.*)$': '<rootDir>/client/src/components/$1',
    '^@pages/(.*)$': '<rootDir>/client/src/pages/$1',
    '^@hooks/(.*)$': '<rootDir>/client/src/hooks/$1',
    '^@contexts/(.*)$': '<rootDir>/client/src/contexts/$1',
    '^@lib/(.*)$': '<rootDir>/client/src/lib/$1',
    '^@utils/(.*)$': '<rootDir>/client/src/utils/$1',
    '^@assets/(.*)$': '<rootDir>/client/src/assets/$1',
    '^@shared/(.*)$': '<rootDir>/shared/$1',
  },

  // File extensions to test
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json'],

  // Transform configuration
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        ['@babel/preset-react', { runtime: 'automatic' }],
        '@babel/preset-typescript'
      ],
      plugins: [
        '@babel/plugin-transform-runtime',
        '@babel/plugin-proposal-class-properties',
        '@babel/plugin-proposal-optional-chaining',
        '@babel/plugin-proposal-nullish-coalescing-operator'
      ]
    }],
    '^.+\\.(css|scss|sass)$': 'jest-transform-stub',
    '^.+\\.(jpg|jpeg|png|gif|svg)$': 'jest-transform-stub'
  },

  // Ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(react-leaflet|@react-leaflet|leaflet|react-force-graph-2d|force-graph|d3-.*)/)'
  ],

  // Test file patterns
  testMatch: [
    '<rootDir>/tests/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/client/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/client/src/**/*.{test,spec}.{js,jsx,ts,tsx}'
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'client/src/**/*.{js,jsx,ts,tsx}',
    '!client/src/**/*.d.ts',
    '!client/src/**/index.{js,jsx,ts,tsx}',
    '!client/src/vite-env.d.ts',
    '!client/src/main.tsx',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/build/**',
    '!**/dist/**'
  ],

  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './client/src/components/': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    },
    './client/src/pages/': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },

  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'clover',
    'json-summary'
  ],

  coverageDirectory: '<rootDir>/coverage',

  // Module directories
  moduleDirectories: ['node_modules', '<rootDir>'],

  // Test timeout
  testTimeout: 30000,

  // Error handling
  errorOnDeprecated: true,
  
  // Mock configuration
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,

  // Reporter configuration
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: './test-results',
      outputName: 'junit.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true
    }]
  ],

  // Global setup
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json'
    }
  },

  // Verbose output for debugging
  verbose: true,

  // Watch mode configuration
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/build/',
    '<rootDir>/dist/',
    '<rootDir>/coverage/'
  ],

  // Custom test environment options
  testEnvironmentOptions: {
    url: 'http://localhost:3000'
  },

  // Performance testing configuration
  maxWorkers: '50%',
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',

  // Snapshot configuration
  updateSnapshot: false,

  // Module resolution
  resolver: undefined,

  // Force exit after tests complete
  forceExit: false,
  detectOpenHandles: true
};