const jwt = require('jsonwebtoken');
// method used generate the jwt toekn for the user 
function generateToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      // name travels in the token because gigController and bookingController
      // read req.user.name when recording who created a gig or booking.
      // Without it both fall back to the placeholders "Freelancer" and
      // "Client", so every listing shows the same name.
      name: user.name,
      email: user.email,
      // Falls back to the least privileged role. It must be a role the
      // authorize middleware recognises, otherwise the token is valid but
      // matches nothing.
      role: user.role || "client" 
    },
    process.env.JWT_SECRET,
    { 
       algorithm: 'HS256',
      expiresIn: process.env.JWT_EXPIRES_IN,
      issuer: process.env.JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE
    }
  );
}

module.exports = { generateToken };