// src/controllers/cancellationController.js
// PHASE 6 — Cancellation: HTTP layer for PATCH /api/bookings/:id/cancel

const cancellationFlowService = require("../services/cancellationFlowService");
const { asyncHandler } = require("../middleware/errorHandler");

// PATCH /api/bookings/:id/cancel
const cancelBooking = asyncHandler(async (req, res) => {
  const { reasonCode, bookingAmount } = req.body;

  const employee = {
    id: req.user.id,
    name: req.user.name,
    email: req.user.email,
    ip: req.ip,
  };

  const result = await cancellationFlowService.cancelBooking(employee, req.params.id, {
    reasonCode,
    bookingAmount: bookingAmount ? parseFloat(bookingAmount) : 0,
  });

  res.status(200).json({
    booking: result.booking,
    feeDescription: result.feeDescription,
    feeAmount: result.feeAmount,
    message: "Booking cancelled successfully.",
  });
});

// GET /api/bookings/:id/cancellation-preview
const previewCancellation = asyncHandler(async (req, res) => {
  const employee = { id: req.user.id };
  const preview = await cancellationFlowService.previewCancellationFee(employee, req.params.id);
  res.status(200).json({ preview });
});

module.exports = { cancelBooking, previewCancellation };
