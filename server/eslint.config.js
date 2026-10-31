export default [
  {
    files: ['src/**/*.js', 'prisma/**/*.js', 'scripts/**/*.js', 'tests/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
    },
    rules: {
      // RULES.md section 9 — pino only, never console.
      'no-console': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-var': 'error',
      'prefer-const': 'error',
      eqeqeq: ['error', 'smart'],
    },
  },
  {
    // The seed and scripts report progress to a human on the terminal.
    files: ['prisma/seed.js', 'scripts/**/*.js'],
    rules: { 'no-console': 'off' },
  },
];
