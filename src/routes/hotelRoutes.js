// src/routes/hotelRoutes.js
// PHASE 3 — Hotels: GET /api/hotels, GET /api/hotels/:id

const express = require("express");
const hotelController = require("../controllers/hotelController");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

// All hotel endpoints require a logged-in employee (any role)
router.get("/", requireAuth, hotelController.listHotels);
router.get("/:id", requireAuth, hotelController.getHotel);

module.exports = router;
