// src/services/hotelService.js
// PHASE 3 — Hotels: data access layer.
// Reads from hotels, hotel_distances, hotel_packages, hotel_nodal_officers
// (schema unchanged, as specified).

const pool = require("../db/pool");
const { ApiError } = require("../middleware/errorHandler");

/** Returns all active hotels with full nested details (distances, packages, nodal officer). */
async function getAllHotels() {
  const hotelsResult = await pool.query(
    `SELECT id, name, address, phone, email, website
     FROM hotels WHERE is_active = TRUE ORDER BY name`
  );
  const hotels = hotelsResult.rows;

  // Fetch nested details in parallel per hotel
  await Promise.all(hotels.map(attachHotelDetails));

  return hotels;
}

/** Returns a single hotel by ID with full nested details. Throws 404 if not found. */
async function getHotelById(hotelId) {
  const result = await pool.query(
    `SELECT id, name, address, phone, email, website
     FROM hotels WHERE id = $1 AND is_active = TRUE`,
    [hotelId]
  );
  if (!result.rows.length) {
    throw new ApiError(404, "Hotel not found.");
  }
  const hotel = result.rows[0];
  await attachHotelDetails(hotel);
  return hotel;
}

/** Mutates `hotel` in place, adding airports/busStands/railwayStations/package arrays/nodalOfficer. */
async function attachHotelDetails(hotel) {
  const [distances, packages, nodal] = await Promise.all([
    pool.query(
      `SELECT type, name, distance_km FROM hotel_distances WHERE hotel_id = $1 ORDER BY distance_km`,
      [hotel.id]
    ),
    pool.query(
      `SELECT category, description FROM hotel_packages WHERE hotel_id = $1 ORDER BY category, sort_order`,
      [hotel.id]
    ),
    pool.query(
      `SELECT name, phone, email FROM hotel_nodal_officers WHERE hotel_id = $1 LIMIT 1`,
      [hotel.id]
    ),
  ]);

  hotel.airports = distances.rows
    .filter((d) => d.type === "airport")
    .map(({ name, distance_km }) => ({ name, km: distance_km }));

  hotel.busStands = distances.rows
    .filter((d) => d.type === "bus_stand")
    .map(({ name, distance_km }) => ({ name, km: distance_km }));

  hotel.railwayStations = distances.rows
    .filter((d) => d.type === "railway_station")
    .map(({ name, distance_km }) => ({ name, km: distance_km }));

  hotel.packageDetails = packages.rows
    .filter((p) => p.category === "package_detail")
    .map((p) => p.description);

  hotel.complimentaryServices = packages.rows
    .filter((p) => p.category === "complimentary")
    .map((p) => p.description);

  hotel.diningConcessions = packages.rows
    .filter((p) => p.category === "dining")
    .map((p) => p.description);

  hotel.nodalOfficer = nodal.rows[0] || null;

  return hotel;
}

module.exports = { getAllHotels, getHotelById };
