import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['dist', 'src/**/*.{ts,tsx}'] },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      ...js.configs.recommended.rules,
    },
  }
];
