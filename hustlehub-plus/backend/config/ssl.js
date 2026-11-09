const fs = require('fs');
const path = require('path');

// Loads the local SSL key and certificate.
// The paths come from the environment so they can differ between machines
// without changing the code, and so the certificate itself is never committed.
function loadCredentials() {
  const certDir = path.join(__dirname, '..', 'certs');
  const keyPath = process.env.SSL_KEY_PATH || path.join(certDir, 'key.pem');
  const certPath = process.env.SSL_CERT_PATH || path.join(certDir, 'cert.pem');

  if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
    throw new Error(
      `SSL certificate not found.\n  key : ${keyPath}\n  cert: ${certPath}\n` +
      `  Run "npm run cert" to generate one.`
    );
  }

  return {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };
}

module.exports = { loadCredentials };
