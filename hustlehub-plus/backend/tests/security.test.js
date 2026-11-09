// Security tests for authentication, roles, ownership, sanitisation and
// validation.
//
// Run with:  npm run test:security
//
// These exercise the middleware and validation rules directly, so no database
// or running server is needed. They cover the negative cases: the requests
// that are supposed to be refused.

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.JWT_ISSUER = process.env.JWT_ISSUER || 'hustlehub';
process.env.JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'hustlehub-app';

const Module = require('module');

// authMiddleware re-reads the user from MongoDB on every request, so the user
// model is stubbed here to keep this suite runnable with no database. The
// accounts match the tokens signed further down.
const stubbedUsers = {
  '507f1f77bcf86cd799439011': { role: 'freelancer', status: 'active', name: 'Freelancer', email: 'f@example.com' },
  '507f1f77bcf86cd799439099': { role: 'freelancer', status: 'active', name: 'Other Freelancer', email: 'o@example.com' },
  '507f1f77bcf86cd799439022': { role: 'client', status: 'active', name: 'Client', email: 'c@example.com' },
  '507f1f77bcf86cd799439033': { role: 'admin', status: 'active', name: 'Admin', email: 'a@example.com' }
};

const UserMock = {
  findById: (id) => ({
    select: () => Promise.resolve(
      stubbedUsers[String(id)] ? Object.assign({ _id: String(id) }, stubbedUsers[String(id)]) : null
    )
  })
};

const originalLoad = Module._load;
Module._load = function(request) {
  if (request.endsWith('/models/User') || request === '../models/User') return UserMock;
  return originalLoad.apply(this, arguments);
};

const express = require('express');
const jwt = require('jsonwebtoken');

const authenticateToken = require('../middleware/authMiddleware');
const { authorize, checkOwnership } = require('../middleware/roleMiddleware');
const sanitizeRequest = require('../middleware/sanitize');
const { validate, registerValidationRules } = require('../middleware/validators');
const { createGigValidationRules } = require('../middleware/gigValidators');
const { createBookingValidationRules } = require('../middleware/bookingValidators');

let passed = 0;
let failed = 0;

function check(name, ok, detail) {
  if (ok) {
    passed++;
    console.log('  pass  ' + name);
  } else {
    failed++;
    console.log('  FAIL  ' + name + (detail ? '  ' + detail : ''));
  }
}

function sign(payload, options) {
  return jwt.sign(payload, process.env.JWT_SECRET, Object.assign({
    expiresIn: '1h',
    issuer: process.env.JWT_ISSUER,
    audience: process.env.JWT_AUDIENCE
  }, options || {}));
}

const app = express();
app.use(express.json());
app.use(sanitizeRequest);

// --- routes that mirror the real ones, without touching the database ---
app.post('/register', registerValidationRules, validate, (req, res) =>
  res.status(201).json({ success: true, data: { role: req.body.role || 'client' } }));

app.post('/gigs', createGigValidationRules, validate, (req, res) =>
  res.status(201).json({ success: true, data: req.body }));

app.post('/bookings', createBookingValidationRules, validate, (req, res) =>
  res.status(201).json({ success: true, data: req.body }));

app.get('/freelancer-only', authenticateToken, authorize('freelancer', 'admin'), (req, res) =>
  res.json({ success: true }));

app.get('/client-only', authenticateToken, authorize('client', 'admin'), (req, res) =>
  res.json({ success: true }));

// A gig owned by user 507f1f77bcf86cd799439011. The id is returned as an
// object with toString, the way a Mongoose ObjectId behaves.
const ownedGig = {
  _id: 'gig1',
  freelancerId: { toString: () => '507f1f77bcf86cd799439011' }
};

app.put('/gigs/:id', authenticateToken, authorize('freelancer', 'admin'),
  checkOwnership(() => Promise.resolve(ownedGig)), (req, res) => res.json({ success: true }));

app.put('/missing/:id', authenticateToken, authorize('freelancer', 'admin'),
  checkOwnership(() => Promise.resolve(null)), (req, res) => res.json({ success: true }));

app.post('/echo', (req, res) => res.json({ body: req.body }));

const server = app.listen(0, async () => {
  const base = 'http://127.0.0.1:' + server.address().port;

  const post = async (path, body, token) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = 'Bearer ' + token;
    const res = await fetch(base + path, { method: 'POST', headers, body: JSON.stringify(body) });
    return { status: res.status, json: await res.json().catch(() => ({})) };
  };
  const get = async (path, token) => {
    const headers = {};
    if (token) headers.Authorization = 'Bearer ' + token;
    const res = await fetch(base + path, { headers });
    return { status: res.status, json: await res.json().catch(() => ({})) };
  };
  const put = async (path, token) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = 'Bearer ' + token;
    const res = await fetch(base + path, { method: 'PUT', headers, body: '{}' });
    return { status: res.status, json: await res.json().catch(() => ({})) };
  };

  const freelancer = sign({ id: '507f1f77bcf86cd799439011', email: 'f@example.com', role: 'freelancer' });
  const otherFreelancer = sign({ id: '507f1f77bcf86cd799439099', email: 'o@example.com', role: 'freelancer' });
  const client = sign({ id: '507f1f77bcf86cd799439022', email: 'c@example.com', role: 'client' });
  const admin = sign({ id: '507f1f77bcf86cd799439033', email: 'a@example.com', role: 'admin' });

  console.log('\nAuthentication');
  let r = await get('/freelancer-only');
  check('no token is rejected', r.status === 401, 'got ' + r.status);
  r = await get('/freelancer-only', 'not-a-real-token');
  check('malformed token is rejected', r.status === 401, 'got ' + r.status);
  r = await get('/freelancer-only', jwt.sign({ id: '1', role: 'freelancer' }, 'the-wrong-secret'));
  check('token signed with the wrong secret is rejected', r.status === 401, 'got ' + r.status);
  r = await get('/freelancer-only', sign({ id: '1', role: 'freelancer' }, { expiresIn: '-1s' }));
  check('expired token is rejected', r.status === 401, 'got ' + r.status);
  r = await get('/freelancer-only', jwt.sign({ id: '1', role: 'freelancer' }, process.env.JWT_SECRET, { issuer: 'somewhere-else', audience: process.env.JWT_AUDIENCE }));
  check('token from another issuer is rejected', r.status === 401, 'got ' + r.status);
  r = await get('/freelancer-only', freelancer);
  check('valid token is accepted', r.status === 200, 'got ' + r.status);

  console.log('\nRole based access control');
  r = await get('/freelancer-only', client);
  check('client cannot reach a freelancer route', r.status === 403, 'got ' + r.status);
  check('refusal is 403 not 401, the user is known but not permitted', r.status === 403);
  r = await get('/client-only', freelancer);
  check('freelancer cannot reach a client route', r.status === 403, 'got ' + r.status);
  r = await get('/freelancer-only', admin);
  check('admin can reach a freelancer route', r.status === 200, 'got ' + r.status);
  r = await get('/client-only', admin);
  check('admin can reach a client route', r.status === 200, 'got ' + r.status);

  console.log('\nOwnership');
  r = await put('/gigs/gig1', freelancer);
  check('owner can update their own gig', r.status === 200, 'got ' + r.status);
  r = await put('/gigs/gig1', otherFreelancer);
  check('another freelancer cannot update it', r.status === 403, 'got ' + r.status);
  r = await put('/gigs/gig1', admin);
  check('admin can update any gig', r.status === 200, 'got ' + r.status);
  r = await put('/missing/gig9', freelancer);
  check('missing resource returns 404', r.status === 404, 'got ' + r.status);

  console.log('\nPrivilege escalation');
  r = await post('/register', { name: 'Test User', email: 'esc@example.com', password: 'Str0ng!Pass', role: 'admin' });
  check('admin cannot be self assigned at registration', r.status === 400, 'got ' + r.status);
  r = await post('/register', { name: 'Test User', email: 'esc@example.com', password: 'Str0ng!Pass', role: 'superuser' });
  check('an unknown role is rejected', r.status === 400, 'got ' + r.status);
  r = await post('/register', { name: 'Test User', email: 'ok@example.com', password: 'Str0ng!Pass', role: 'freelancer' });
  check('freelancer can be self assigned', r.status === 201, 'got ' + r.status);
  r = await post('/register', { name: 'Test User', email: 'ok@example.com', password: 'Str0ng!Pass' });
  check('no role supplied defaults to client', r.status === 201 && r.json.data.role === 'client', JSON.stringify(r.json));

  console.log('\nInjection and scripting');
  r = await post('/echo', { email: { $gt: '' }, name: 'ok' });
  check('mongo operator key is stripped from the body', r.json.body.email === undefined || r.json.body.email.$gt === undefined, JSON.stringify(r.json.body));
  r = await post('/echo', { 'user.role': 'admin', name: 'ok' });
  check('dotted path key is stripped', r.json.body['user.role'] === undefined, JSON.stringify(r.json.body));
  r = await post('/echo', { nested: { $where: 'sleep(1000)' } });
  check('nested operator key is stripped', r.json.body.nested.$where === undefined, JSON.stringify(r.json.body));

  const validGig = { title: 'Logo design for startups', description: 'I will design a professional logo.', price: 250, category: 'Design' };
  r = await post('/gigs', validGig);
  check('a valid gig is accepted', r.status === 201, JSON.stringify(r.json));
  r = await post('/gigs', Object.assign({}, validGig, { title: '<script>alert(1)</script>' }));
  check('script tag in a gig title is rejected', r.status === 400, 'got ' + r.status);
  check('the error does not echo the payload back', !JSON.stringify(r.json).includes('<script>'), JSON.stringify(r.json));
  r = await post('/gigs', Object.assign({}, validGig, { description: 'Template {{7*7}} injection' }));
  check('template expression in a description is rejected', r.status === 400, 'got ' + r.status);
  r = await post('/gigs', Object.assign({}, validGig, { price: 'not-a-number' }));
  check('a non numeric price is rejected', r.status === 400, 'got ' + r.status);
  r = await post('/gigs', Object.assign({}, validGig, { price: -50 }));
  check('a negative price is rejected', r.status === 400, 'got ' + r.status);

  r = await post('/bookings', { gigId: 'not-an-object-id' });
  check('an invalid gig id on a booking is rejected', r.status === 400, 'got ' + r.status);
  r = await post('/bookings', { gigId: '507f1f77bcf86cd799439011', message: 'x'.repeat(1500) });
  check('an oversized booking message is rejected', r.status === 400, 'got ' + r.status);
  r = await post('/bookings', { gigId: '507f1f77bcf86cd799439011', message: 'Looking forward to it' });
  check('a valid booking is accepted', r.status === 201, JSON.stringify(r.json));

  console.log('\nPassword and name rules');
  const account = { name: 'Test User', email: 'pw@example.com' };
  r = await post('/register', Object.assign({}, account, { password: 'password' }));
  check('a password with no uppercase, digit or symbol is rejected', r.status === 400, 'got ' + r.status);
  r = await post('/register', Object.assign({}, account, { password: 'Sh0rt!' }));
  check('a password under 8 characters is rejected', r.status === 400, 'got ' + r.status);
  r = await post('/register', Object.assign({}, account, { password: 'Aa1!' + 'x'.repeat(200) }));
  check('a password over 128 characters is rejected', r.status === 400, 'got ' + r.status);
  r = await post('/register', Object.assign({}, account, { password: 'Str0ng!Pass' }));
  check('a strong password is accepted', r.status === 201, 'got ' + r.status);
  r = await post('/register', { name: '<script>alert(1)</script>', email: 'pw@example.com', password: 'Str0ng!Pass' });
  check('a script tag in the name is rejected', r.status === 400, 'got ' + r.status);
  r = await post('/register', { name: "O'Brien", email: 'pw@example.com', password: 'Str0ng!Pass' });
  check("a real name with an apostrophe is accepted", r.status === 201, 'got ' + r.status);
  r = await post('/register', { name: { $gt: '' }, email: 'pw@example.com', password: 'Str0ng!Pass' });
  check('an object supplied as the name is rejected', r.status === 400, 'got ' + r.status);

  console.log('\nToken contents');
  const decoded = jwt.decode(freelancer);
  check('the token carries the user id', decoded.id !== undefined);
  check('the token carries the role', decoded.role === 'freelancer', decoded.role);
  check('the token does not carry the password', !JSON.stringify(decoded).toLowerCase().includes('password'));

  console.log('\n' + passed + ' passed, ' + failed + ' failed\n');
  server.close();
  process.exit(failed ? 1 : 0);
});
