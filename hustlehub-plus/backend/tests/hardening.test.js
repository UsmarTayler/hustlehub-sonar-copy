const assert = require('assert');
const { isLocked, registerFailure, MAX_FAILED_ATTEMPTS } = require('../utils/lockout');
const { validateEnv } = require('../config/validateEnv');

let failed = 0;
function check(name, fn) {
  try { fn(); console.log('  pass  ' + name); }
  catch (e) { failed++; console.log('  FAIL  ' + name + '  ' + e.message); }
}

console.log('Account lockout');
check('first failures only increment the counter', () => {
  const upd = registerFailure({ failedLoginAttempts: 0, lockUntil: null }, 1000);
  assert.strictEqual(upd.failedLoginAttempts, 1);
  assert.strictEqual(upd.lockUntil, undefined);
});
check('account locks on the configured attempt', () => {
  const upd = registerFailure({ failedLoginAttempts: MAX_FAILED_ATTEMPTS - 1, lockUntil: null }, 1000);
  assert.ok(upd.lockUntil instanceof Date && upd.lockUntil.getTime() > 1000);
  assert.strictEqual(upd.failedLoginAttempts, 0);
});
check('isLocked is true before expiry and false after', () => {
  const u = { lockUntil: new Date(5000) };
  assert.strictEqual(isLocked(u, 4000), true);
  assert.strictEqual(isLocked(u, 6000), false);
});
check('an expired lock restarts the count at 1', () => {
  assert.strictEqual(registerFailure({ failedLoginAttempts: 4, lockUntil: new Date(500) }, 1000).failedLoginAttempts, 1);
});

console.log('Environment validation');
const good = { JWT_SECRET: 'a'.repeat(40), JWT_ISSUER: 'i', JWT_AUDIENCE: 'a', JWT_EXPIRES_IN: '1h', NODE_ENV: 'production' };
check('a strong configuration passes', () => assert.deepStrictEqual(validateEnv(good), []));
check('missing JWT_SECRET is reported', () => assert.ok(validateEnv({ ...good, JWT_SECRET: '' }).length));
check('short JWT_SECRET is rejected', () => assert.ok(validateEnv({ ...good, JWT_SECRET: 'short' }).length));
check('placeholder JWT_SECRET is rejected', () =>
  assert.ok(validateEnv({ ...good, JWT_SECRET: 'your-super-secret-jwt-key-change-this-in-production' }).length));
check('7 day tokens are rejected in production', () => assert.ok(validateEnv({ ...good, JWT_EXPIRES_IN: '7d' }).length));

console.log(failed ? '\n' + failed + ' failed' : '\nall passed');
process.exit(failed ? 1 : 0);