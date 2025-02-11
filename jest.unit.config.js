/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  testRegex: '\\.service\\.spec\\.ts$', 
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: ['src/**/*.service.ts'],
  coverageDirectory: './coverage/unit',
  testEnvironment: 'node',

  rootDir: 'src',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@db/(.*)$': '<rootDir>/../prisma/$1',
  },
};
