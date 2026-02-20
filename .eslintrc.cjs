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
  rules: {
    'max-lines': ['warn', {
      max: 500,
      skipBlankLines: true,
      skipComments: true
    }],
    'max-lines-per-function': ['warn', {
      max: 50,
      skipBlankLines: true,
      skipComments: true
    }],
    'no-unused-vars': ['warn', {
      vars: 'all',
      args: 'none',
      ignoreRestSiblings: true,
      varsIgnorePattern: '^_'
    }],
    'no-console': 'off',
    'prefer-const': 'warn',
    'no-var': 'warn',
    'no-undef': 'warn'
  },
  globals: {
    chrome: 'readonly'
  }
};
