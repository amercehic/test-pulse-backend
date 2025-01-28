import tsPlugin from '@typescript-eslint/eslint-plugin';
import prettierPlugin from 'eslint-plugin-prettier';
import tsParser from '@typescript-eslint/parser'; // Import the parser directly

export default {
  files: ['src/**/*.{ts,js}'], // Explicitly include these files
  ignores: ['dist/', 'node_modules/'], // Use `ignores` instead of `ignorePatterns`
  languageOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    parser: tsParser, // Pass the imported parser directly
    globals: {
      node: true,
      es2021: true,
    },
  },
  plugins: {
    '@typescript-eslint': tsPlugin,
    prettier: prettierPlugin,
  },
  rules: {
    'prettier/prettier': 'error',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    'no-console': 'warn',
  },
  settings: {
    // Any settings you need can go here
  },
};