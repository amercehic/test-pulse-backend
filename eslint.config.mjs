import tsPlugin from '@typescript-eslint/eslint-plugin';
import prettierPlugin from 'eslint-plugin-prettier';
import simpleImportSortPlugin from 'eslint-plugin-simple-import-sort';
import tsParser from '@typescript-eslint/parser';

export default {
  files: ['src/**/*.{ts,js}'],
  ignores: ['dist/', 'node_modules/'],
  languageOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    parser: tsParser,
    globals: {
      node: true,
      es2021: true,
    },
  },
  plugins: {
    '@typescript-eslint': tsPlugin,
    prettier: prettierPlugin,
    'simple-import-sort': simpleImportSortPlugin,
  },
  rules: {
    'prettier/prettier': 'error',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    'no-console': 'warn',
    'simple-import-sort/imports': 'error',
    'simple-import-sort/exports': 'error',
    'eqeqeq': ['error', 'always'],
    'curly': 'error',
    'no-var': 'error',
    'prefer-const': 'error',
    'no-shadow': 'warn',
    'no-eval': 'error',
    'no-implied-eval': 'error',
  },
  settings: {},
};
