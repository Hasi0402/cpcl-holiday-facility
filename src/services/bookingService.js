// src/services/bookingService.js
// PHASE 4 — Bookings: data access + business logic layer.
// Handles eligibility validation, quota enforcement, booking creation, audit logging,
// and triggers the submitted/admin-notify emails. Schema is unchanged (bookings,
// booking_quotas, audit_log, hotels, employees tables as already migrated).

const pool = require("../db/pool");
const { ApiError } = require("../middleware/errorHandler");
const { generateBookingId } = require("../utils/idGenerator");
const { getFinancialYearForDate } = require("./financialYearService");
const emailService = require("./emailService");
const { logAudit } = require("./authService");

/**
 * Validates booking input against business rules.
 * Throws ApiError(400) on the first violation found.
 */
function validateBookingInput({ hotelId, hotelRef, checkIn, nights, numAdults, numChildren, numRooms }) {
  if (!hotelId || !hotelRef || !checkIn || !nights || !numAdults || !numRooms) {
    throw new ApiError(400, "Missing required booking fields (hotelId, hotelRef, checkIn, nights, numAdults, numRooms).");
  }
  if (!Number.isInteger(nights) || nights < 1 || nights > 3) {
    throw new ApiError(400, "Stay duration must be between 1 and 3 nights.");
  }
  if (!Number.isInteger(numAdults) || numAdults < 1 || numAdults > 5) {
    throw new ApiError(400, "Number of adults must be between 1 and 5.");
  }
  const children = numChildren || 0;
  if (!Number.isInteger(children) || children < 0 || children > 4) {
    throw new ApiError(400, "Number of children must be between 0 and 4.");
  }
  if (!Number.isInteger(numRooms) || numRooms < 1 || numRooms > 2) {
    throw new ApiError(400, "Number of rooms must be 1 or 2.");
  }

  const checkInDate = new Date(checkIn);
  if (isNaN(checkInDate.getTime())) {
    throw new ApiError(400, "Invalid check-in date.");
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (checkInDate < today) {
    throw new ApiError(400, "Check-in date cannot be in the past.");
  }
}

/**
 * Creates a new Holiday Home booking for an employee.
 * Enforces: one booking per employee per financial year (via row-locked quota check),
 * hotel must exist & be active. On success: persists booking, marks quota used,
 * writes audit log, fires "submitted" email to employee + "new booking" email to IT admin.
 */
async function createBooking(employee, bookingInput) {
  validateBookingInput(bookingInput);

  const { hotelId, hotelRef, checkIn, nights, numAdults, numChildren = 0, numRooms, purpose } = bookingInput;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const financialYear = getFinancialYearForDate(checkIn);

    // Row-level lock on the quota row prevents two concurrent requests from
    // both passing the "not used yet" check for the same employee+year.
    const quotaResult = await client.query(
      `SELECT is_used FROM booking_quotas WHERE employee_id = $1 AND financial_year = $2 FOR UPDATE`,
      [employee.id, financialYear]
    );

    if (quotaResult.rows.length && quotaResult.rows[0].is_used) {
      await client.query("ROLLBACK");
      throw new ApiError(
        409,
        `You have already used your Holiday Facility booking for ${financialYear}. Only one booking is allowed per financial year.`
      );
    }

    const hotelResult = await client.query(
      `SELECT * FROM hotels WHERE id = $1 AND is_active = TRUE`,
      [hotelId]
    );
    if (!hotelResult.rows.length) {
      await client.query("ROLLBACK");
      throw new ApiError(404, "Selected hotel was not found or is not currently eligible.");
    }
    const hotel = hotelResult.rows[0];

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkInDate);
    checkOutDate.setDate(checkOutDate.getDate() + nights);
    const checkOut = checkOutDate.toISOString().split("T")[0];

    const bookingId = generateBookingId();

    const insertResult = await client.query(
      `INSERT INTO bookings
        (id, employee_id, hotel_id, hotel_ref, financial_year, check_in, check_out,
         nights, num_adults, num_children, num_rooms, purpose, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'Pending')
       RETURNING *`,
      [bookingId, employee.id, hotelId, hotelRef, financialYear, checkIn, checkOut,
       nights, numAdults, numChildren, numRooms, purpose || null]
    );
    const booking = insertResult.rows[0];

    // Mark the employee's quota for this FY as used, pointing at this booking.
    await client.query(
      `INSERT INTO booking_quotas (employee_id, financial_year, is_used, booking_id)
       VALUES ($1,$2,TRUE,$3)
       ON CONFLICT (employee_id, financial_year)
       DO UPDATE SET is_used = TRUE, booking_id = $3`,
      [employee.id, financialYear, bookingId]
    );

    await client.query(
      `INSERT INTO audit_log (actor_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1,'BOOK_SUBMIT','booking',$2,$3,$4)`,
      [employee.id, bookingId, JSON.stringify({ hotelId, checkIn, nights, numRooms, financialYear }), employee.ip || null]
    );

    await client.query("COMMIT");

    // Fire emails after commit — failures here must not roll back a successful booking.
    emailService.sendBookingSubmitted(booking, hotel, employee).catch((err) =>
      console.error(`Failed to send booking-submitted email for ${bookingId}:`, err.message)
    );
    emailService.sendAdminNewBooking(booking, hotel, employee).catch((err) =>
      console.error(`Failed to send admin-notify email for ${bookingId}:`, err.message)
    );

    return booking;
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch (_) {}
    throw err;
  } finally {
    client.release();
  }
}

/** Returns all bookings belonging to a specific employee, most recent first. */
async function getBookingsByEmployee(employeeId) {
  const result = await pool.query(
    `SELECT b.*, h.name AS hotel_name, h.address AS hotel_address, h.phone AS hotel_phone
     FROM bookings b
     JOIN hotels h ON h.id = b.hotel_id
     WHERE b.employee_id = $1
     ORDER BY b.submitted_at DESC`,
    [employeeId]
  );
  return result.rows;
}

/**
 * Returns a single booking by ID. If `requesterId` is provided, the booking must
 * belong to that employee (used for the employee-facing GET /api/bookings/:id route);
 * pass null to skip ownership check (used by admin/finance routes elsewhere).
 */
async function getBookingById(bookingId, requesterId = null) {
  const result = await pool.query(
    `SELECT b.*, h.name AS hotel_name, h.address AS hotel_address, h.phone AS hotel_phone,
            h.email AS hotel_email, h.website AS hotel_website,
            e.name AS employee_name, e.email AS employee_email, e.department
     FROM bookings b
     JOIN hotels h ON h.id = b.hotel_id
     JOIN employees e ON e.id = b.employee_id
     WHERE b.id = $1`,
    [bookingId]
  );

  if (!result.rows.length) {
    throw new ApiError(404, "Booking not found.");
  }

  const booking = result.rows[0];

  if (requesterId && booking.employee_id !== requesterId) {
    throw new ApiError(403, "You do not have permission to view this booking.");
  }

  return booking;
}

/** Returns the quota state for an employee across both supported financial years. */
async function getQuotaStatus(employeeId) {
  const result = await pool.query(
    `SELECT financial_year, is_used, booking_id FROM booking_quotas WHERE employee_id = $1`,
    [employeeId]
  );
  const quotaMap = {};
  result.rows.forEach((r) => {
    quotaMap[r.financial_year] = { used: r.is_used, bookingId: r.booking_id };
  });

  const { getCurrentFinancialYear, SUPPORTED_YEARS } = require("./financialYearService");

  const quota = {};
  SUPPORTED_YEARS.forEach((year) => {
    quota[year] = quotaMap[year] || { used: false, bookingId: null };
  });

  return { currentYear: getCurrentFinancialYear(), quota };
}

module.exports = {
  validateBookingInput,
  createBooking,
  getBookingsByEmployee,
  getBookingById,
  getQuotaStatus,
};
