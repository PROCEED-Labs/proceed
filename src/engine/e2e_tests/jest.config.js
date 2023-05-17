module.exports = {
  displayName: 'Engine E2E Tests',
  testMatch: ['<rootDir>/**/*.e2e.test.js'],
  globalSetup: './globalSetup.js',
  globalTeardown: './globalTeardown.js',
  preset: 'ts-jest',
};
