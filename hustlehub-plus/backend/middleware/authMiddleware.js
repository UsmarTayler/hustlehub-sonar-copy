const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Verifies the token, then re-reads the user so a status change (suspend or
// ban) takes effect immediately. Without the database check a banned user
// would keep working until their token expired. The cost is one indexed
// lookup by _id per authenticated request.
async function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: "Authorization header missing"
    });
  }

  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Invalid authorization format"
    });
  }

  const token = authHeader.split(" ")[1];

  let decoded;
  try {
    decoded = jwt.verify(
      token,
      process.env.JWT_SECRET,
      {
        algorithms: ['HS256'],
        issuer: process.env.JWT_ISSUER,
        audience: process.env.JWT_AUDIENCE
      }
    );
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token has expired"
      });
    }

    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token"
      });
    }

    return res.status(401).json({
      success: false,
      message: "Authentication failed"
    });
  }

  try {
    const user = await User.findById(decoded.id).select('role status name email');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Account no longer exists"
      });
    }

    if (user.status && user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: "This account has been " + user.status
      });
    }

    // Refresh role and name from the database so a role change is picked up
    // without forcing a re-login.
    req.user = {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status
    };

    next();
  } catch {
    return res.status(500).json({
      success: false,
      message: "Authentication failed"
    });
  }
}

// Kept as an alternative name for consistency with the roleMiddleware module,
// but not used by the existing routes — they all use `authorize` from
// ../middleware/roleMiddleware instead.
function authorizeRoles() {
  var allowedRoles = Array.prototype.slice.call(arguments);
  return function (req, res, next) {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this resource',
      });
    }
    next();
  };
}


module.exports = authenticateToken;
module.exports.authenticateToken = authenticateToken;
module.exports.authorizeRoles = authorizeRoles;