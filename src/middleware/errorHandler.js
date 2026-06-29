// src/middleware/errorHandler.js
// PHASE 1 — Centralized error handling.
// Controllers call next(err) or throw inside an asyncHandler-wrapped function;
// everything funnels here so error responses are consistent across the API.

// Wrap async route handlers so rejected promises reach errorHandler automatically,
// instead of needing try/catch in every single controller method.
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Custom error class for predictable, intentional API errors (4xx).
class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

function notFoundHandler(req, res, next) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

function errorHandler(err, req, res, next) {
  // Postgres unique violation
  if (err.code === "23505") {
    return res.status(409).json({ error: "A record with these details already exists." });
  }
  // Postgres FK violation
  if (err.code === "23503") {
    return res.status(400).json({ error: "Related record not found (foreign key violation)." });
  }
  // Postgres check constraint violation
  if (err.code === "23514") {
    return res.status(400).json({ error: "Value violates a database constraint." });
  }

  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : "Internal server error.";

  if (!err.isOperational) {
    console.error("UNHANDLED ERROR:", err);
  } else {
    console.warn(`Handled error [${statusCode}]:`, err.message);
  }

  res.status(statusCode).json({ error: message });
}

module.exports = { asyncHandler, ApiError, notFoundHandler, errorHandler };
