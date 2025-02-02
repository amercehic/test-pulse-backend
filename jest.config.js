/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  // Because our code and tests live in `src/`, we keep this rootDir:
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',

  // Add these lines to map `@/` and `@prisma/` to real paths
  rootDir: 'src',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    // Updated alias to '@db/'
    '^@db/(.*)$': '<rootDir>/../prisma/$1',
  },
};
