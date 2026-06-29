// src/services/adminService.js
// PHASE 5 — Admin (IT) approval workflow: data access + business logic layer.

const pool = require("../db/pool");
const { ApiError } = require("../middleware/errorHandler");
const emailService = require("./emailService");

/** Returns all bookings with status='Pending', oldest first (FIFO review queue). */
async function getPendingBookings() {
  const result = await pool.query(
    `SELECT b.*, h.name AS hotel_name, e.name AS employee_name, e.email AS employee_email,
            e.role AS employee_role, e.department
     FROM bookings b
     JOIN hotels h ON h.id = b.hotel_id
     JOIN employees e ON e.id = b.employee_id
     WHERE b.status = 'Pending'
     ORDER BY b.submitted_at ASC`
  );
  return result.rows;
}

/** Returns all bookings regardless of status, optionally filtered by status. Newest first. */
async function getAllBookings(statusFilter) {
  let sql = `
    SELECT b.*, h.name AS hotel_name, e.name AS employee_name, e.email AS employee_email,
           e.role AS employee_role, e.department
    FROM bookings b
    JOIN hotels h ON h.id = b.hotel_id
    JOIN employees e ON e.id = b.employee_id`;
  const params = [];
  if (statusFilter) {
    sql += ` WHERE b.status = $1`;
    params.push(statusFilter);
  }
  sql += ` ORDER BY b.submitted_at DESC`;
  const result = await pool.query(sql, params);
  return result.rows;
}

/**
 * Approves a Pending booking. Locks the row, validates current status,
 * updates to Approved, writes audit log, sends approval email.
 */
async function approveBooking(adminId, bookingId, ip) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const bookingResult = await client.query(`SELECT * FROM bookings WHERE id = $1 FOR UPDATE`, [bookingId]);
    if (!bookingResult.rows.length) {
      await client.query("ROLLBACK");
      throw new ApiError(404, "Booking not found.");
    }
    const booking = bookingResult.rows[0];

    if (booking.status !== "Pending") {
      await client.query("ROLLBACK");
      throw new ApiError(409, `Booking is already ${booking.status} and cannot be approved.`);
    }

    const updateResult = await client.query(
      `UPDATE bookings
       SET status = 'Approved', reviewed_by = $1, reviewed_at = NOW(), updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [adminId, bookingId]
    );
    const updatedBooking = updateResult.rows[0];

    await client.query(
      `INSERT INTO audit_log (actor_id, action, entity_type, entity_id, ip_address)
       VALUES ($1,'APPROVE','booking',$2,$3)`,
      [adminId, bookingId, ip || null]
    );

    await client.query("COMMIT");

    const [hotelResult, employeeResult] = await Promise.all([
      pool.query(`SELECT * FROM hotels WHERE id = $1`, [booking.hotel_id]),
      pool.query(`SELECT * FROM employees WHERE id = $1`, [booking.employee_id]),
    ]);

    emailService
      .sendBookingApproved(updatedBooking, hotelResult.rows[0], employeeResult.rows[0])
      .catch((err) => console.error(`Failed to send approval email for ${bookingId}:`, err.message));

    return updatedBooking;
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch (_) {}
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Rejects a Pending booking. Locks the row, validates current status,
 * updates to Rejected, restores the employee's quota (CPRC rejection is
 * fee-exempt per policy, and shouldn't burn the employee's annual slot),
 * writes audit log, sends rejection email.
 */
async function rejectBooking(adminId, bookingId, reason, ip) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const bookingResult = await client.query(`SELECT * FROM bookings WHERE id = $1 FOR UPDATE`, [bookingId]);
    if (!bookingResult.rows.length) {
      await client.query("ROLLBACK");
      throw new ApiError(404, "Booking not found.");
    }
    const booking = bookingResult.rows[0];

    if (booking.status !== "Pending") {
      await client.query("ROLLBACK");
      throw new ApiError(409, `Booking is already ${booking.status} and cannot be rejected.`);
    }

    const updateResult = await client.query(
      `UPDATE bookings
       SET status = 'Rejected', reviewed_by = $1, reviewed_at = NOW(), rejection_reason = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [adminId, reason || null, bookingId]
    );
    const updatedBooking = updateResult.rows[0];

    await client.query(
      `UPDATE booking_quotas SET is_used = FALSE, booking_id = NULL
       WHERE employee_id = $1 AND financial_year = $2`,
      [booking.employee_id, booking.financial_year]
    );

    await client.query(
      `INSERT INTO audit_log (actor_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1,'REJECT','booking',$2,$3,$4)`,
      [adminId, bookingId, JSON.stringify({ reason: reason || null }), ip || null]
    );

    await client.query("COMMIT");

    const [hotelResult, employeeResult] = await Promise.all([
      pool.query(`SELECT * FROM hotels WHERE id = $1`, [booking.hotel_id]),
      pool.query(`SELECT * FROM employees WHERE id = $1`, [booking.employee_id]),
    ]);

    emailService
      .sendBookingRejected(updatedBooking, hotelResult.rows[0], employeeResult.rows[0], reason)
      .catch((err) => console.error(`Failed to send rejection email for ${bookingId}:`, err.message));

    return updatedBooking;
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch (_) {}
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { getPendingBookings, getAllBookings, approveBooking, rejectBooking };
