// src/server.js
// PHASE 1 — Server Setup
// Express app bootstrap: middleware, CORS, rate limiting, route registration, error handling.

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/authRoutes");
const hotelRoutes = require("./routes/hotelRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const adminRoutes = require("./routes/adminRoutes");
const financeRoutes = require("./routes/financeRoutes");

const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");

const app = express();
app.set("trust proxy", 1);

// ──────────────────────────────────────────────────────────────────────────
// CORS
// ──────────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.FRONTEND_URL || "*")
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin: function (origin, callback) {
      // allow non-browser tools (curl/Postman) which send no origin
      if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

// ──────────────────────────────────────────────────────────────────────────
// Body parsing
// ──────────────────────────────────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// ──────────────────────────────────────────────────────────────────────────
// Global rate limiting (general API traffic)
// Login has its own stricter limiter inside authRoutes.
// ──────────────────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,                 // 300 requests / 15 min / IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down and try again shortly." },
});
app.use("/api", globalLimiter);

// ──────────────────────────────────────────────────────────────────────────
// Request logger (lightweight, no external dependency)
// ──────────────────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    console.log(
      `${new Date().toISOString()} ${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`
    );
  });
  next();
});

// ──────────────────────────────────────────────────────────────────────────
// Health check
// ──────────────────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "CPCL Holiday Facility API", time: new Date().toISOString() });
});

app.get("/debug-db", (req, res) => {
  res.json({
    databaseUrl: process.env.DATABASE_URL
      ? process.env.DATABASE_URL.replace(/:(.*?)@/, ":****@")
      : "MISSING",
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Route registration
// ──────────────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/hotels", hotelRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/finance", financeRoutes);

// ──────────────────────────────────────────────────────────────────────────
// 404 + global error handler (must be registered last)
// ──────────────────────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ──────────────────────────────────────────────────────────────────────────
// Start server
// ──────────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`\n🚀 CPCL Holiday Facility API running on port ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health\n`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Closing server gracefully...");
  server.close(() => process.exit(0));
});
process.on("SIGINT", () => {
  console.log("\nSIGINT received. Closing server gracefully...");
  server.close(() => process.exit(0));
});

module.exports = app;
