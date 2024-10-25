// eslint.config.js
import eslintPluginReact from 'eslint-plugin-react';
import eslintPluginReactHooks from 'eslint-plugin-react-hooks';

export default [
  {
    ignores: ['dist/**'],
  },
  {
    files: ['**/*.jsx', '**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: '@babel/eslint-parser', // Use Babel parser to support JSX
      parserOptions: {
        requireConfigFile: false, // Allows parsing without a Babel config
        babelOptions: {
          presets: ['@babel/preset-react'], // Ensure Babel is set up for React
        },
      },
    },
    plugins: {
      react: eslintPluginReact,
      'react-hooks': eslintPluginReactHooks,
    },
    rules: {
      'react/react-in-jsx-scope': 'off', // React import is not needed for JSX
      'react/jsx-uses-react': 'off',
      'react/jsx-uses-vars': 'warn',
      'no-unused-vars': 'warn',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
];