// src/routes/authRoutes.js
// PHASE 2 — Authentication: POST /api/auth/login, GET /api/auth/me

const express = require("express");
const rateLimit = require("express-rate-limit");
const authController = require("../controllers/authController");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

// Stricter limiter on login specifically — deters brute-force credential guessing
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                  // 10 attempts / 15 min / IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again in 15 minutes." },
});

router.post("/login", loginLimiter, authController.login);
router.get("/me", requireAuth, authController.getCurrentUser);

module.exports = router;
