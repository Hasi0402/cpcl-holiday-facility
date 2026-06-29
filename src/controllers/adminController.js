// src/controllers/adminController.js
// PHASE 5 — Admin: HTTP layer for pending list, approve, reject.

const adminService = require("../services/adminService");
const { asyncHandler } = require("../middleware/errorHandler");

// GET /api/admin/bookings/pending
const getPendingBookings = asyncHandler(async (req, res) => {
  const bookings = await adminService.getPendingBookings();
  res.status(200).json({ bookings, count: bookings.length });
});

// GET /api/admin/bookings  (optional ?status= filter — handy for the "All Bookings" tab)
const getAllBookings = asyncHandler(async (req, res) => {
  const bookings = await adminService.getAllBookings(req.query.status);
  res.status(200).json({ bookings, count: bookings.length });
});

// PATCH /api/admin/bookings/:id/approve
const approveBooking = asyncHandler(async (req, res) => {
  const booking = await adminService.approveBooking(req.user.id, req.params.id, req.ip);
  res.status(200).json({ booking, message: "Booking approved and confirmation email sent." });
});

// PATCH /api/admin/bookings/:id/reject
const rejectBooking = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const booking = await adminService.rejectBooking(req.user.id, req.params.id, reason, req.ip);
  res.status(200).json({ booking, message: "Booking rejected. Employee notified and quota restored." });
});

module.exports = { getPendingBookings, getAllBookings, approveBooking, rejectBooking };
