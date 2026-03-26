import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/tests'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.(ts)$': [
      'ts-jest',
      {
        isolatedModules: true,
        tsconfig: '<rootDir>/tsconfig.test.json',
      },
    ],
  },
};

export default config;
