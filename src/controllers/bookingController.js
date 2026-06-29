// src/controllers/bookingController.js
// PHASE 4 — Bookings: HTTP layer for POST /api/bookings, GET /api/bookings/my, GET /api/bookings/:id
// (Cancellation lives in its own controller — see PHASE 6.)

const bookingService = require("../services/bookingService");
const { asyncHandler } = require("../middleware/errorHandler");

// POST /api/bookings
const createBooking = asyncHandler(async (req, res) => {
  const { hotelId, hotelRef, checkIn, nights, numAdults, numChildren, numRooms, purpose } = req.body;

  const employee = {
    id: req.user.id,
    name: req.user.name,
    email: req.user.email,
    ip: req.ip,
  };

  const booking = await bookingService.createBooking(employee, {
    hotelId: parseInt(hotelId),
    hotelRef,
    checkIn,
    nights: parseInt(nights),
    numAdults: parseInt(numAdults),
    numChildren: numChildren !== undefined ? parseInt(numChildren) : 0,
    numRooms: parseInt(numRooms),
    purpose,
  });

  res.status(201).json({ booking, message: "Booking request submitted successfully." });
});

// GET /api/bookings/my
const getMyBookings = asyncHandler(async (req, res) => {
  const bookings = await bookingService.getBookingsByEmployee(req.user.id);
  res.status(200).json({ bookings });
});

// GET /api/bookings/:id
const getBookingById = asyncHandler(async (req, res) => {
  const booking = await bookingService.getBookingById(req.params.id, req.user.id);
  res.status(200).json({ booking });
});

// GET /api/bookings/quota/status
const getQuotaStatus = asyncHandler(async (req, res) => {
  const status = await bookingService.getQuotaStatus(req.user.id);
  res.status(200).json(status);
});

module.exports = { createBooking, getMyBookings, getBookingById, getQuotaStatus };
