import js from '@eslint/js';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

/**
 * Flat ESLint config for the Node/Express backend.
 * Prettier owns formatting; `eslint-config-prettier` (last) disables any
 * stylistic rules that would fight it.
 */
export default [
  {
    ignores: ['node_modules/**', 'public/dist/**', 'coverage/**', 'logs/**'],
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-console': 'off',
    },
  },
  prettier,
];
