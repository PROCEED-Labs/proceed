module.exports = {
  displayName: 'Management System v2',
  testMatch: ['<rootDir>/tests/unit/**/*.(js|ts)?(x)'],
  preset: 'ts-jest',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  transform: {
    '^.+\\.js?$': ['ts-jest'],
  },
};
