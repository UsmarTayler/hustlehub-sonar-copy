// Per-account brute-force protection. The IP rate limiter can be bypassed by
// rotating IPs; this counts failures against the account instead.
const MAX_FAILED_ATTEMPTS = Number(process.env.LOCKOUT_MAX_ATTEMPTS) || 5;
const LOCK_MINUTES = Number(process.env.LOCKOUT_MINUTES) || 15;

function isLocked(user, now) {
  return Boolean(user.lockUntil && user.lockUntil.getTime() > (now || Date.now()));
}

function registerFailure(user, now) {
  const t = now || Date.now();
  const previous = user.lockUntil && user.lockUntil.getTime() <= t ? 0 : (user.failedLoginAttempts || 0);
  const attempts = previous + 1;
  const update = { failedLoginAttempts: attempts };
  if (attempts >= MAX_FAILED_ATTEMPTS) {
    update.lockUntil = new Date(t + LOCK_MINUTES * 60 * 1000);
    update.failedLoginAttempts = 0;
  }
  return update;
}

module.exports = { isLocked, registerFailure, MAX_FAILED_ATTEMPTS, LOCK_MINUTES };