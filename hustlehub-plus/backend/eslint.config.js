const js = require('@eslint/js');
const globals = require('globals');
const security = require('eslint-plugin-security');

// Static analysis for the API: ESLint's recommended correctness rules plus
// eslint-plugin-security, which flags risky patterns such as dynamic regular
// expressions, unsafe object access and child_process use.
module.exports = [
  { ignores: ['node_modules/**', 'certs/**'] },
  js.configs.recommended,
  security.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: {
      // Express error handlers must declare all four arguments.
      'no-unused-vars': ['error', { args: 'after-used', argsIgnorePattern: '^(next|_)' }],
    },
  },
];
