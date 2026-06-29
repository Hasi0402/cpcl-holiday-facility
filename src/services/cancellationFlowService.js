// src/services/cancellationFlowService.js
// PHASE 6 — Cancellation workflow: orchestrates fee calculation, status update,
// audit logging, and the two emails (employee + finance). Uses the existing
// calculateCancellationFee() from cancellationService.js (kept as-is, unchanged).

const pool = require("../db/pool");
const { ApiError } = require("../middleware/errorHandler");
const { calculateCancellationFee } = require("./cancellationService");
const emailService = require("./emailService");

const FEE_EXEMPT_REASONS = ["cprc_rejection", "hotel_non_confirmation", "hotel_side_failure"];

/**
 * Cancels a booking owned by `employee`.
 * - Computes the cancellation fee per policy (or exempts it for the 3 listed reason codes).
 * - Updates booking status -> 'Cancelled', stores fee description + amount.
 * - If fee-exempt, restores the employee's quota for that financial year so they can rebook.
 * - Writes an audit log entry.
 * - Sends cancellation email to the employee, and (if fee > 0) a notice to Finance.
 */
async function cancelBooking(employee, bookingId, { reasonCode, bookingAmount } = {}) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const bookingResult = await client.query(
      `SELECT * FROM bookings WHERE id = $1 AND employee_id = $2 FOR UPDATE`,
      [bookingId, employee.id]
    );
    if (!bookingResult.rows.length) {
      await client.query("ROLLBACK");
      throw new ApiError(404, "Booking not found.");
    }
    const booking = bookingResult.rows[0];

    if (!["Pending", "Approved"].includes(booking.status)) {
      await client.query("ROLLBACK");
      throw new ApiError(409, `Cannot cancel a booking that is already ${booking.status}.`);
    }

    let feeDescription, feeAmount;

    if (reasonCode && FEE_EXEMPT_REASONS.includes(reasonCode)) {
      feeDescription = "No cancellation charges apply (CPRC rejection / hotel non-confirmation / hotel-side cancellation or failure).";
      feeAmount = 0;
    } else {
      const fee = calculateCancellationFee(booking.check_in, booking.num_rooms, booking.nights, bookingAmount || 0);
      feeDescription = fee.description;
      feeAmount = fee.feeAmount;
    }

    const updateResult = await client.query(
      `UPDATE bookings
       SET status = 'Cancelled', cancelled_at = NOW(),
           cancellation_fee_desc = $1, cancellation_fee_amount = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [feeDescription, feeAmount, bookingId]
    );
    const updatedBooking = updateResult.rows[0];

    // Fee-exempt cancellation restores quota eligibility for the same financial year.
    if (feeAmount === 0) {
      await client.query(
        `UPDATE booking_quotas SET is_used = FALSE, booking_id = NULL
         WHERE employee_id = $1 AND financial_year = $2`,
        [booking.employee_id, booking.financial_year]
      );
    }

    await client.query(
      `INSERT INTO audit_log (actor_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1,'CANCEL','booking',$2,$3,$4)`,
      [employee.id, bookingId, JSON.stringify({ reasonCode: reasonCode || null, feeDescription, feeAmount }), employee.ip || null]
    );

    await client.query("COMMIT");

    const hotelResult = await pool.query(`SELECT * FROM hotels WHERE id = $1`, [booking.hotel_id]);
    const hotel = hotelResult.rows[0];

    emailService
      .sendBookingCancelled(updatedBooking, hotel, employee, feeDescription)
      .catch((err) => console.error(`Failed to send cancellation email for ${bookingId}:`, err.message));

    if (feeAmount > 0) {
      emailService
        .sendFinanceCancellationNotice(updatedBooking, hotel, employee, feeDescription, feeAmount)
        .catch((err) => console.error(`Failed to send finance notice for ${bookingId}:`, err.message));
    }

    return { booking: updatedBooking, feeDescription, feeAmount };
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch (_) {}
    throw err;
  } finally {
    client.release();
  }
}

/** Read-only fee preview, shown to the employee before they confirm cancellation. */
async function previewCancellationFee(employee, bookingId) {
  const result = await pool.query(
    `SELECT * FROM bookings WHERE id = $1 AND employee_id = $2`,
    [bookingId, employee.id]
  );
  if (!result.rows.length) {
    throw new ApiError(404, "Booking not found.");
  }
  const booking = result.rows[0];
  return calculateCancellationFee(booking.check_in, booking.num_rooms, booking.nights);
}

module.exports = { cancelBooking, previewCancellationFee, FEE_EXEMPT_REASONS };
