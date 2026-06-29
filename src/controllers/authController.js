// src/controllers/authController.js
// PHASE 2 — Authentication: HTTP layer. Parses req, calls authService, shapes res.

const authService = require("../services/authService");
const { asyncHandler } = require("../middleware/errorHandler");

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { employeeId, password } = req.body;
  const { token, user } = await authService.authenticate(employeeId, password);
  res.status(200).json({ token, user });
});

// GET /api/auth/me
const getCurrentUser = asyncHandler(async (req, res) => {
  // req.user is set by requireAuth middleware after verifying the JWT
  const employee = await authService.getEmployeeById(req.user.id);
  res.status(200).json({ user: employee });
});

module.exports = { login, getCurrentUser };
