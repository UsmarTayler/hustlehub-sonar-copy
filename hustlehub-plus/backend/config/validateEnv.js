// Fail-fast configuration check: refuse to run in production with weak secrets.
const PLACEHOLDERS = [
  'your-super-secret-jwt-key-change-this-in-production',
  'changeme', 'secret', 'test-secret',
];

function validateEnv(env) {
  const e = env || process.env;
  const problems = [];

  ['JWT_SECRET', 'JWT_ISSUER', 'JWT_AUDIENCE', 'JWT_EXPIRES_IN'].forEach(function (k) {
    if (!e[k]) problems.push(k + ' is not set');
  });

  if (e.JWT_SECRET) {
    if (e.JWT_SECRET.length < 32) problems.push('JWT_SECRET must be at least 32 characters');
    if (PLACEHOLDERS.includes(e.JWT_SECRET.toLowerCase())) problems.push('JWT_SECRET is a placeholder value');
  }

  if (e.NODE_ENV === 'production' && /^\d+d$/.test(e.JWT_EXPIRES_IN || '') && parseInt(e.JWT_EXPIRES_IN, 10) > 1) {
    problems.push('JWT_EXPIRES_IN longer than 1 day is not allowed in production');
  }

  return problems;
}

function assertEnv() {
  const problems = validateEnv();
  if (!problems.length) return;
  const message = 'Configuration error:\n  - ' + problems.join('\n  - ');
  if (process.env.NODE_ENV === 'production') {
    console.error(message);
    process.exit(1);
  }
  console.warn(message + '\n  (continuing because NODE_ENV is not production)');
}

module.exports = { validateEnv, assertEnv };