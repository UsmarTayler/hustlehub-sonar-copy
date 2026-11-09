// Strips MongoDB operator syntax out of incoming data.
//
// Without this, a body like { "email": { "$gt": "" } } reaches Mongoose as a
// query operator rather than a value, which matches the first user in the
// collection. That is NoSQL injection, and it is the reason every field is
// also type checked in the validators.
//
// Keys beginning with $ are operators. Keys containing a dot can reach into
// nested document paths. Both are removed rather than rejected so a stray
// field does not break a legitimate request.
//
// Note: req.query is a getter in Express 5 and cannot be reassigned, so query
// strings are handled by validation rather than here.

function clean(value, removed, path) {
  if (!value || typeof value !== 'object') return value;

  if (Array.isArray(value)) {
    return value.map(function (item, i) {
      return clean(item, removed, path + '[' + i + ']');
    });
  }

  Object.keys(value).forEach(function (key) {
    if (key.startsWith('$') || key.includes('.')) {
      removed.push(path ? path + '.' + key : key);
      delete value[key];
      return;
    }
    value[key] = clean(value[key], removed, path ? path + '.' + key : key);
  });

  return value;
}

function sanitizeRequest(req, res, next) {
  var removed = [];

  if (req.body) clean(req.body, removed, '');
  if (req.params) clean(req.params, removed, '');

  if (removed.length) {
    console.warn('Blocked operator syntax in request to ' + req.originalUrl + ': ' + removed.join(', '));
  }

  next();
}

module.exports = sanitizeRequest;
