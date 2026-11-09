const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const certDir = path.join(__dirname, '..', 'certs');
const keyPath = path.join(certDir, 'key.pem');
const certPath = path.join(certDir, 'cert.pem');
const configPath = path.join(certDir, 'openssl.cnf');

const opensslConfig = `[req]
default_bits       = 2048
prompt             = no
default_md         = sha256
distinguished_name = dn
x509_extensions    = v3_req

[dn]
C  = ZA
O  = HustleHub Plus
CN = localhost

[v3_req]
basicConstraints = CA:FALSE
keyUsage         = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName   = @alt_names

[alt_names]
DNS.1 = localhost
IP.1  = 127.0.0.1
IP.2  = ::1
`;

fs.mkdirSync(certDir, { recursive: true });

if (fs.existsSync(keyPath) && fs.existsSync(certPath) && !process.argv.includes('--force')) {
  console.log('Certificate already exists. Run with --force to replace it.');
  process.exit(0);
}

fs.writeFileSync(configPath, opensslConfig);

try {
  execFileSync('openssl', [
    'req', '-x509', '-nodes', '-newkey', 'rsa:2048',
    '-keyout', keyPath, '-out', certPath, '-days', '365',
    '-config', configPath, '-extensions', 'v3_req',
  ], { stdio: 'inherit' });
} catch {
  console.error('OpenSSL failed or was not found on the PATH.');
  process.exit(1);
}

console.log('\nCertificate created:\n  ' + keyPath + '\n  ' + certPath);
console.log('\nThese files are ignored by git and must never be committed.');
console.log('The certificate is self signed, so browsers will warn that it is');
console.log('not trusted. In Postman, turn off SSL certificate verification.');