// src/controllers/hotelController.js
// PHASE 3 — Hotels: HTTP layer.

const hotelService = require("../services/hotelService");
const { asyncHandler } = require("../middleware/errorHandler");

// GET /api/hotels
const listHotels = asyncHandler(async (req, res) => {
  const hotels = await hotelService.getAllHotels();
  res.status(200).json({ hotels });
});

// GET /api/hotels/:id
const getHotel = asyncHandler(async (req, res) => {
  const hotel = await hotelService.getHotelById(req.params.id);
  res.status(200).json({ hotel });
});

module.exports = { listHotels, getHotel };
