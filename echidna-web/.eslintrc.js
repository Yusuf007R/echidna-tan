module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  parser: '@typescript-eslint/parser',
  plugins: ['react', '@typescript-eslint'],
  rules: {
    'no-use-before-define': 'off',
    '@typescript-eslint/no-use-before-define': ['error'],
    'react/jsx-filename-extension': [
      1,
      {extensions: ['.js', '.jsx', '.ts', '.tsx']},
    ],
    'react/function-component-definition': [0],
    'no-unused-vars': 0,
    'func-names': 0,
    'react/prop-types': 0,
    camelcase: 0,
    'react/display-name': 0,
    '@typescript-eslint/no-use-before-define': 0,
  },
  extends: [
    'plugin:react/recommended',
    // 'airbnb',
    'prettier',
    'plugin:react/jsx-runtime',
  ],
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 12,
    sourceType: 'module',
  },
};