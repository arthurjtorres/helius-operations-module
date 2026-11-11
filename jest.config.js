// Jest: testes unitários dos arquivos *.test.ts em src (TypeScript via ts-jest).
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
};
