// src/services/authService.js
// PHASE 2 — Authentication: data access + business logic layer.
// Controllers call into this; this is the only layer that talks to the DB for auth.

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db/pool");
const { ApiError } = require("../middleware/errorHandler");

/**
 * Looks up an employee by ID, verifies password, returns a signed JWT + user object.
 * Throws ApiError(401) on any invalid-credentials case (deliberately the same
 * message for "no such employee" and "wrong password" — don't leak which one).
 */
async function authenticate(employeeId, password) {
  if (!employeeId || !password) {
    throw new ApiError(400, "Employee ID and password are required.");
  }

  const result = await pool.query(
    `SELECT id, name, email, password_hash, role, grade, department, is_active
     FROM employees WHERE id = $1`,
    [employeeId.toUpperCase().trim()]
  );

  if (!result.rows.length) {
    throw new ApiError(401, "Invalid Employee ID or password.");
  }

  const employee = result.rows[0];

  if (!employee.is_active) {
    throw new ApiError(403, "This account has been deactivated. Please contact HR.");
  }

  const passwordMatches = await bcrypt.compare(password, employee.password_hash);
  if (!passwordMatches) {
    throw new ApiError(401, "Invalid Employee ID or password.");
  }

  const token = signToken(employee);

  await logAudit(employee.id, "LOGIN", "employee", employee.id, null);

  return {
    token,
    user: sanitizeEmployee(employee),
  };
}

/** Re-fetches an employee by ID — used by GET /api/auth/me to confirm token is still valid + fresh data. */
async function getEmployeeById(employeeId) {
  const result = await pool.query(
    `SELECT id, name, email, role, grade, department, is_active
     FROM employees WHERE id = $1`,
    [employeeId]
  );
  if (!result.rows.length) {
    throw new ApiError(404, "Employee not found.");
  }
  if (!result.rows[0].is_active) {
    throw new ApiError(403, "This account has been deactivated.");
  }
  return result.rows[0];
}

function signToken(employee) {
  return jwt.sign(
    {
      id: employee.id,
      name: employee.name,
      email: employee.email,
      role: employee.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
  );
}

function sanitizeEmployee(employee) {
  // Strip password_hash before sending to client
  const { password_hash, ...safe } = employee;
  return safe;
}

async function logAudit(actorId, action, entityType, entityId, details, ipAddress) {
  try {
    await pool.query(
      `INSERT INTO audit_log (actor_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [actorId, action, entityType, entityId, details ? JSON.stringify(details) : null, ipAddress || null]
    );
  } catch (err) {
    // Audit logging must never break the main request flow
    console.error("Audit log write failed:", err.message);
  }
}

module.exports = { authenticate, getEmployeeById, sanitizeEmployee, logAudit };
