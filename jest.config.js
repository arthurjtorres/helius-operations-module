// Jest: testes unitários dos arquivos *.test.ts em src (TypeScript via ts-jest).
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  // todo o src, para que arquivo sem teste conte como 0% (T21 item 5)
  collectCoverageFrom: ['src/**/*.ts', '!src/__tests__/**', '!src/**/*.test.ts', '!src/database/migrations/**'],
  // piso medido em 2026-11-26, arredondado para baixo: só pode subir
  coverageThreshold: { global: { statements: 69, branches: 71, functions: 70, lines: 68 } },
};
