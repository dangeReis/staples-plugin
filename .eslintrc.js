const maxLinesWarningRule = require('./eslint-rules/max-lines-warning');

module.exports = {
  env: {
    browser: true,
    es2021: true,
    webextensions: true,
    jest: true,
    node: true
  },
  extends: 'eslint:recommended',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  plugins: {
    'soft-lines': {
      rules: {
        'max-lines-warning': maxLinesWarningRule
      }
    }
  },
  rules: {
    // Module size enforcement (constitution requirement)
    'soft-lines/max-lines-warning': ['warn', {
      max: 200,
      skipBlankLines: true,
      skipComments: true
    }],
    'max-lines': ['error', {
      max: 500,
      skipBlankLines: true,
      skipComments: true
    }],
    'max-lines-per-function': ['warn', {
      max: 50,
      skipBlankLines: true,
      skipComments: true
    }],

    // Code quality
    'no-unused-vars': ['error', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_'
    }],
    'no-console': 'off', // Allow console in Chrome extension
    'prefer-const': 'error',
    'no-var': 'error'
  },
  globals: {
    chrome: 'readonly'
  }
};
