function authorize() {
  var allowedRoles = Array.prototype.slice.call(arguments);
  
  return function(req, res, next) {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    var userRole = req.user.role || 'user';
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions. Required role: ' + allowedRoles.join(' or ')
      });
    }
    
    next();
  };
}

// Confirms the requester owns the resource they are acting on.
// Role checks alone are not enough: authorize('freelancer') lets any
// freelancer through, which would allow one freelancer to edit another's gig.
//
// getResource may return a promise, so Mongoose lookups can be passed straight
// in. ownerField defaults to freelancerId but can be changed for resources
// owned by a client, such as a booking.
function checkOwnership(getResource, ownerField) {
  var field = ownerField || 'freelancerId';

  return function(req, res, next) {
    Promise.resolve(getResource(req))
      .then(function(resource) {
        if (!resource) {
          return res.status(404).json({
            success: false,
            message: 'Resource not found'
          });
        }

        // Mongoose ids are ObjectId instances while req.user.id comes out of
        // the token as a string, so both sides are cast before comparing.
        // Without this the comparison is always false and every request is
        // rejected.
        var ownerId = resource[field] ? resource[field].toString() : null;

        if (ownerId !== String(req.user.id) && req.user.role !== 'admin') {
          return res.status(403).json({
            success: false,
            message: 'You do not have permission to access this resource'
          });
        }

        req.resource = resource;
        next();
      })
      .catch(next);
  };
}

module.exports = { authorize, checkOwnership };