const js = require('@eslint/js');
const nodePlugin = require('eslint-plugin-node');
const importPlugin = require('eslint-plugin-import');

module.exports = [
  // Modern ESLint flat config: explicit ignore patterns (replaces .eslintignore)
  {
    ignores: [
      'frontend/**',
      'artifacts/**',
      'coverage/**',
      'reports/**',
      'uploads/**',
      'frontend/build/**',
      'frontend/coverage/**',
      '**/lcov-report/**'
    ]
  },
  js.configs.recommended,
  {
    // Include .cjs files (Jest lifecycle and script files) so the flat config
    // applies to both module and CommonJS script files.
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
  // Node globals
  require: 'readonly',
  module: 'readonly',
  setTimeout: 'readonly',
  setImmediate: 'readonly',
        // Jest globals
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        // Also expose jest global and common Node globals used in scripts/tests
        jest: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        process: 'readonly',
        console: 'readonly'
      }
    },
    plugins: { node: nodePlugin, import: importPlugin },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off'
    }
  }
];
