/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    moduleFileExtensions: ['js', 'json', 'ts'],
    testRegex: '\\.controller\\.spec\\.ts$', 
    transform: {
      '^.+\\.ts$': 'ts-jest',
    },
    collectCoverageFrom: ['src/**/*.controller.ts'],
    coverageDirectory: './coverage/e2e',
    testEnvironment: 'node',
  
    rootDir: 'src',
    moduleNameMapper: {
      '^@/(.*)$': '<rootDir>/$1',
      '^@db/(.*)$': '<rootDir>/../prisma/$1',
    },
  };
  