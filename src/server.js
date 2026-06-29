// src/server.js

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");

const pool = require("./db/pool");

const authRoutes = require("./routes/authRoutes");
const hotelRoutes = require("./routes/hotelRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const adminRoutes = require("./routes/adminRoutes");
const financeRoutes = require("./routes/financeRoutes");

const {
  notFoundHandler,
  errorHandler,
} = require("./middleware/errorHandler");

const app = express();

app.set("trust proxy", 1);

// ======================================================================
// DEBUG ROUTES (REMOVE LATER)
// ======================================================================

app.get("/debug-db", (req, res) => {
  res.json({
    databaseUrl: process.env.DATABASE_URL
      ? process.env.DATABASE_URL.replace(/:(.*?)@/, ":****@")
      : "MISSING",
  });
});

app.get("/debug-login", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, password_hash
       FROM employees
       WHERE id = 'ADMIN01'`
    );

    if (!result.rows.length) {
      return res.json({
        error: "ADMIN01 not found",
      });
    }

    const user = result.rows[0];

    const match = await bcrypt.compare(
      "admin",
      user.password_hash
    );

    res.json({
      id: user.id,
      hash: user.password_hash,
      passwordMatches: match,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
      code: err.code,
      stack: err.stack,
    });
  }
});

// ======================================================================
// CORS
// ======================================================================

const allowedOrigins = (process.env.FRONTEND_URL || "*")
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin(origin, callback) {
      if (
        !origin ||
        allowedOrigins.includes("*") ||
        allowedOrigins.includes(origin)
      ) {
        return callback(null, true);
      }
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

// ======================================================================
// BODY PARSER
// ======================================================================

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// ======================================================================
// RATE LIMIT
// ======================================================================

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many requests.",
  },
});

app.use("/api", globalLimiter);

// ======================================================================
// LOGGER
// ======================================================================

app.use((req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    console.log(
      `${new Date().toISOString()} ${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`
    );
  });

  next();
});

// ======================================================================
// HEALTH
// ======================================================================

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "CPCL Holiday Facility API",
    time: new Date().toISOString(),
  });
});

// ======================================================================
// ROUTES
// ======================================================================

app.use("/api/auth", authRoutes);
app.use("/api/hotels", hotelRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/finance", financeRoutes);

// ======================================================================
// ERROR HANDLERS
// ======================================================================

app.use(notFoundHandler);
app.use(errorHandler);

// ======================================================================
// START SERVER
// ======================================================================

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// ======================================================================
// SHUTDOWN
// ======================================================================

process.on("SIGTERM", () => {
  server.close(() => process.exit(0));
});

process.on("SIGINT", () => {
  server.close(() => process.exit(0));
});

module.exports = app;