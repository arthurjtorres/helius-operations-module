// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // migrations: legado em JS, não são mais usadas (o banco já existe)
  { ignores: ['build/', 'node_modules/', 'coverage/', 'src/database/migrations/', '*.js', '*.mjs'] },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    // tsconfig.eslint.json inclui os testes, que o tsconfig do build exclui
    languageOptions: { parserOptions: { project: './tsconfig.eslint.json', tsconfigRootDir: import.meta.dirname } },
    rules: { '@typescript-eslint/no-floating-promises': 'error' },
  },
  {
    // mocks e jest.isolateModules
    files: ['src/__tests__/**'],
    rules: { '@typescript-eslint/no-explicit-any': 'off', '@typescript-eslint/no-require-imports': 'off' },
  },
);
