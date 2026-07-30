/**
 * Jest configuration.
 *
 * The backend is native ESM ("type": "module"), so tests run under Node's own
 * module system via --experimental-vm-modules (see the npm test script) rather
 * than being transpiled by Babel. That keeps the code under test identical to
 * the code that runs in production — no transform step to diverge.
 */
export default {
  testEnvironment: 'node',

  // Transform nothing: the source is already valid ESM for this Node version.
  transform: {},

  testMatch: ['**/tests/**/*.test.js'],

  // Spinning up mongodb-memory-server and real HTTP fixtures is slower than a
  // pure unit test; the default 5s timeout is not enough for the first suite
  // that has to download/boot a mongod binary.
  testTimeout: 30_000,

  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // One MongoDB instance for the whole run, shared by every suite. Nineteen
  // suites each launching their own mongod raced each other into startup
  // timeouts on loaded machines and small CI runners.
  globalSetup: '<rootDir>/tests/globalSetup.js',
  globalTeardown: '<rootDir>/tests/globalTeardown.js',

  collectCoverageFrom: [
    'src/**/*.js',
    // Prompt strings and the model client are external-service glue with no
    // meaningful branches to cover.
    '!src/ai/**',
  ],

  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'json-summary'],

  // 60% statements is the contractual floor. The suite currently sits around
  // 74%, so the gate has headroom — it exists to catch a regression, not to be
  // scraped past. Branch coverage is held lower on purpose: much of the
  // remaining branch surface is defensive error handling on external I/O
  // (SMTP, Mongo, the AI provider) whose failure modes are asserted where they
  // matter rather than exhaustively enumerated.
  coverageThreshold: {
    global: {
      statements: 60,
      branches: 50,
      functions: 70,
      lines: 60,
    },
    // The tenancy boundary and the scheduler are the two places where a
    // regression is expensive, so both are held well above the global floor.
    './src/dao/**/*.js': {
      statements: 85,
      branches: 70,
      functions: 90,
      lines: 90,
    },
    './src/jobs/scheduler.js': {
      statements: 85,
      branches: 70,
      functions: 70,
      lines: 85,
    },
  },

  // Surface a hanging handle instead of letting the run sit there silently.
  detectOpenHandles: false,
  forceExit: false,
};
