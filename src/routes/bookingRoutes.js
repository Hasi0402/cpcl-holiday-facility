// src/routes/bookingRoutes.js
// PHASE 4 — Bookings: POST /api/bookings, GET /api/bookings/my, GET /api/bookings/:id
// PHASE 6 — Cancellation: PATCH /api/bookings/:id/cancel (mounted here since it's a /bookings sub-resource)

const express = require("express");
const bookingController = require("../controllers/bookingController");
const cancellationController = require("../controllers/cancellationController");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

const EMPLOYEE_ROLES = ["Supervisor", "Non-Supervisor"];

// Order matters: specific/static paths before the dynamic ":id" path.
router.get("/my", requireAuth, requireRole(...EMPLOYEE_ROLES), bookingController.getMyBookings);
router.get("/quota/status", requireAuth, requireRole(...EMPLOYEE_ROLES), bookingController.getQuotaStatus);

router.post("/", requireAuth, requireRole(...EMPLOYEE_ROLES), bookingController.createBooking);

router.get("/:id/cancellation-preview", requireAuth, requireRole(...EMPLOYEE_ROLES), cancellationController.previewCancellation);
router.patch("/:id/cancel", requireAuth, requireRole(...EMPLOYEE_ROLES), cancellationController.cancelBooking);

router.get("/:id", requireAuth, requireRole(...EMPLOYEE_ROLES), bookingController.getBookingById);

module.exports = router;
