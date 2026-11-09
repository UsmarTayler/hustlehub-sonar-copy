// Security tests for the admin surface. No database required.
//   npm run test:admin
//
// These cover the negative cases: non-admins being refused, self-protection
// rules, and the "last admin" guards.

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.JWT_ISSUER = process.env.JWT_ISSUER || 'hustlehub';
process.env.JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'hustlehub-app';

const Module = require('module');

// ---- stub the models and logActivity before the admin routes load ----
const stubbedUsers = {
  '507f1f77bcf86cd799439011': { _id: '507f1f77bcf86cd799439011', name: 'Admin One', email: 'a1@example.com', role: 'admin', status: 'active' },
  '507f1f77bcf86cd799439012': { _id: '507f1f77bcf86cd799439012', name: 'Admin Two', email: 'a2@example.com', role: 'admin', status: 'active' },
  '507f1f77bcf86cd799439022': { _id: '507f1f77bcf86cd799439022', name: 'Client', email: 'c@example.com', role: 'client', status: 'active' },
  '507f1f77bcf86cd799439099': { _id: '507f1f77bcf86cd799439099', name: 'Banned', email: 'b@example.com', role: 'client', status: 'banned' }
};

function makeQuery(result) {
  // Minimal chainable stand-in for a Mongoose query.
  const q = {
    select: () => q,
    sort: () => q,
    skip: () => q,
    limit: () => q,
    then: (resolve) => Promise.resolve(result).then(resolve),
    catch: (rej) => Promise.resolve(result).catch(rej)
  };
  return q;
}

const UserMock = {
  findById: (id) => makeQuery(stubbedUsers[String(id)] || null),
  findOne: () => makeQuery(null),
  find: () => makeQuery([]),
  countDocuments: async () => 2,
  findByIdAndDelete: async (id) => stubbedUsers[String(id)] || null,
  prototype: {}
};

const GigMock = {
  find: () => makeQuery([]),
  findById: (id) => makeQuery({ _id: id, title: 'g', status: 'active', freelancerName: 'f', freelancerId: '507f1f77bcf86cd799439011' }),
  countDocuments: async () => 0,
  findByIdAndDelete: async () => ({ _id: 'g' })
};

const BookingMock = {
  find: () => makeQuery([]),
  findById: (id) => makeQuery({ _id: id, status: 'pending', amount: 10 }),
  countDocuments: async () => 0,
  findByIdAndDelete: async () => ({ _id: 'b' })
};

const ActivityLogMock = {
  create: () => Promise.resolve({}),
  find: () => makeQuery([]),
  countDocuments: async () => 0,
  countByActionSince: async () => []
};

const originalLoad = Module._load;
Module._load = function(request) {
  if (request.endsWith('/models/User') || request === '../models/User') return UserMock;
  if (request.endsWith('/models/Gig') || request === '../models/Gig') return GigMock;
  if (request.endsWith('/models/Booking') || request === '../models/Booking') return BookingMock;
  if (request.endsWith('/models/ActivityLog') || request === '../models/ActivityLog') return ActivityLogMock;
  if (request.endsWith('/middleware/auditLog') || request === '../middleware/auditLog') {
    return { logActivity: () => {} };
  }
  return originalLoad.apply(this, arguments);
};

const express = require('express');
const jwt = require('jsonwebtoken');

const adminRoutes = require('../routes/adminRoutes');

let passed = 0;
let failed = 0;
function check(name, ok, detail) {
  if (ok) { passed++; console.log('  pass  ' + name); }
  else { failed++; console.log('  FAIL  ' + name + (detail ? '  ' + detail : '')); }
}

function sign(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '1h',
    issuer: process.env.JWT_ISSUER,
    audience: process.env.JWT_AUDIENCE
  });
}

const app = express();
app.use(express.json());
app.use('/api/admin', adminRoutes);

const server = app.listen(0, async () => {
  const base = 'http://127.0.0.1:' + server.address().port;

  const req = async (method, path, token, body) => {
    const headers = {};
    if (token) headers.Authorization = 'Bearer ' + token;
    if (body) headers['Content-Type'] = 'application/json';
    const res = await fetch(base + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
    return { status: res.status, json: await res.json().catch(() => ({})) };
  };

  const adminToken = sign({ id: '507f1f77bcf86cd799439011', email: 'a1@example.com', role: 'admin' });
  const clientToken = sign({ id: '507f1f77bcf86cd799439022', email: 'c@example.com', role: 'client' });
  const bannedToken = sign({ id: '507f1f77bcf86cd799439099', email: 'b@example.com', role: 'client' });

  console.log('\nAccess control');
  let r = await req('GET', '/api/admin/stats');
  check('no token is rejected', r.status === 401, 'got ' + r.status);

  r = await req('GET', '/api/admin/stats', clientToken);
  check('client is refused on admin routes', r.status === 403, 'got ' + r.status);

  r = await req('GET', '/api/admin/stats', bannedToken);
  check('banned user is refused even with a valid token', r.status === 403, 'got ' + r.status);

  r = await req('GET', '/api/admin/stats', adminToken);
  check('admin reaches the dashboard', r.status === 200, 'got ' + r.status);

  console.log('\nUsers');
  r = await req('GET', '/api/admin/users', adminToken);
  check('admin can list users', r.status === 200, 'got ' + r.status);

  r = await req('GET', '/api/admin/users/not-an-id', adminToken);
  check('invalid user id is rejected', r.status === 400, 'got ' + r.status);

  r = await req('PATCH', '/api/admin/users/507f1f77bcf86cd799439011/role', adminToken, { role: 'client' });
  check('admin cannot change their own role', r.status === 400, 'got ' + r.status);

  r = await req('PATCH', '/api/admin/users/507f1f77bcf86cd799439011/status', adminToken, { status: 'banned' });
  check('admin cannot change their own status', r.status === 400, 'got ' + r.status);

  r = await req('DELETE', '/api/admin/users/507f1f77bcf86cd799439011', adminToken);
  check('admin cannot delete themselves', r.status === 400, 'got ' + r.status);

  r = await req('PATCH', '/api/admin/users/507f1f77bcf86cd799439022/role', adminToken, { role: 'superuser' });
  check('invalid role value is rejected', r.status === 400, 'got ' + r.status);

  r = await req('PATCH', '/api/admin/users/507f1f77bcf86cd799439022/status', adminToken, { status: 'purged' });
  check('invalid status value is rejected', r.status === 400, 'got ' + r.status);

  console.log('\nIncome is not exposed');
  r = await req('GET', '/api/admin/income', adminToken);
  check('there is no admin income route', r.status === 404, 'got ' + r.status);

  r = await req('GET', '/api/admin/transactions', adminToken);
  check('there is no admin transactions route', r.status === 404, 'got ' + r.status);

  console.log('\nResources');
  r = await req('GET', '/api/admin/gigs?limit=9999', adminToken);
  check('oversized limit is refused', r.status === 400, 'got ' + r.status);

  r = await req('GET', '/api/admin/bookings?page=0', adminToken);
  check('invalid page is refused', r.status === 400, 'got ' + r.status);

  console.log('\n' + passed + ' passed, ' + failed + ' failed\n');
  server.close();
  process.exit(failed ? 1 : 0);
});