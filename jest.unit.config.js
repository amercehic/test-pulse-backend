/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  testRegex: '\\.service\\.spec\\.ts$', // Runs only unit tests in services
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: ['src/**/*.service.ts'],
  coverageDirectory: './coverage/unit',
  testEnvironment: 'node',

  // Path aliases
  rootDir: 'src',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@db/(.*)$': '<rootDir>/../prisma/$1',
  },
};
