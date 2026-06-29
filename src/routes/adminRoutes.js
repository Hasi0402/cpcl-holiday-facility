// src/routes/adminRoutes.js
// PHASE 5 — Admin: GET /api/admin/bookings/pending,
//                   PATCH /api/admin/bookings/:id/approve,
//                   PATCH /api/admin/bookings/:id/reject
// All routes restricted to role = 'IT Admin'.

const express = require("express");
const adminController = require("../controllers/adminController");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(requireAuth, requireRole("IT Admin"));

router.get("/bookings/pending", adminController.getPendingBookings);
router.get("/bookings", adminController.getAllBookings);
router.patch("/bookings/:id/approve", adminController.approveBooking);
router.patch("/bookings/:id/reject", adminController.rejectBooking);

module.exports = router;
