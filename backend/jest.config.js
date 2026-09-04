// jest.config.js
module.exports = {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/tests/setup/loadTestEnv.js'],
  testMatch: ['**/*.test.js'],
  testTimeout: 15000,
  // Run test files serially per project convention (package.json uses
  // --runInBand) since they share one real Postgres test database.
};
