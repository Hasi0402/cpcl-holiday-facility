// src/middleware/authMiddleware.js
// JWT verification + role-based access guards.

const jwt = require("jsonwebtoken");
const { ApiError } = require("./errorHandler");

// Verifies JWT from Authorization: Bearer <token>
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return next(new ApiError(401, "Authentication required."));
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, name, email, role }
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return next(new ApiError(401, "Session expired. Please log in again."));
    }
    return next(new ApiError(401, "Invalid authentication token."));
  }
}

// Role-based guard — pass one or more allowed roles
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new ApiError(401, "Not authenticated."));
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, "You do not have permission to perform this action."));
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
