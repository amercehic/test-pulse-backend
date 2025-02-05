/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    moduleFileExtensions: ['js', 'json', 'ts'],
    testRegex: '\\.controller\\.spec\\.ts$', // Runs only E2E tests in controllers
    transform: {
      '^.+\\.ts$': 'ts-jest',
    },
    collectCoverageFrom: ['src/**/*.controller.ts'],
    coverageDirectory: './coverage/e2e',
    testEnvironment: 'node',
  
    // Path aliases
    rootDir: 'src',
    moduleNameMapper: {
      '^@/(.*)$': '<rootDir>/$1',
      '^@db/(.*)$': '<rootDir>/../prisma/$1',
    },
  };
  