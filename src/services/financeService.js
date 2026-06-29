// src/services/financeService.js
// PHASE 7 — Finance: reporting & statistics layer. Read-only — no mutations here.

const pool = require("../db/pool");

/** All cancelled bookings that carry a cancellation fee, newest first. */
async function getCancellations() {
  const result = await pool.query(
    `SELECT b.id, b.check_in, b.check_out, b.nights, b.num_rooms, b.financial_year,
            b.cancelled_at, b.cancellation_fee_desc, b.cancellation_fee_amount,
            h.name AS hotel_name,
            e.id AS employee_id, e.name AS employee_name, e.department
     FROM bookings b
     JOIN hotels h ON h.id = b.hotel_id
     JOIN employees e ON e.id = b.employee_id
     WHERE b.status = 'Cancelled' AND b.cancellation_fee_amount > 0
     ORDER BY b.cancelled_at DESC`
  );

  const totalFees = result.rows.reduce((sum, row) => sum + parseFloat(row.cancellation_fee_amount || 0), 0);

  return { cancellations: result.rows, totalFeesCollectible: totalFees };
}

/**
 * Aggregate report: booking counts by status, by financial year, and fee-recovery stats.
 * Intended for the Finance dashboard's summary cards / charts.
 */
async function getReports() {
  const [byStatus, byYear, feeStats, allTimeTotals] = await Promise.all([
    pool.query(`
      SELECT status, COUNT(*)::int AS count
      FROM bookings GROUP BY status`),

    pool.query(`
      SELECT financial_year,
             COUNT(*)::int AS total_bookings,
             COUNT(*) FILTER (WHERE status = 'Approved')::int  AS approved,
             COUNT(*) FILTER (WHERE status = 'Rejected')::int  AS rejected,
             COUNT(*) FILTER (WHERE status = 'Cancelled')::int AS cancelled,
             COUNT(*) FILTER (WHERE status = 'Pending')::int   AS pending
      FROM bookings
      GROUP BY financial_year
      ORDER BY financial_year`),

    pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE cancellation_fee_amount = 0)::int   AS fee_exempt_count,
        COUNT(*) FILTER (WHERE cancellation_fee_amount > 0)::int   AS fee_charged_count,
        COALESCE(SUM(cancellation_fee_amount) FILTER (WHERE cancellation_fee_amount > 0), 0)::numeric AS total_fees,
        COALESCE(AVG(cancellation_fee_amount) FILTER (WHERE cancellation_fee_amount > 0), 0)::numeric AS avg_fee
      FROM bookings
      WHERE status = 'Cancelled'`),

    pool.query(`SELECT COUNT(*)::int AS total_bookings FROM bookings`),
  ]);

  const statusBreakdown = {};
  byStatus.rows.forEach((r) => { statusBreakdown[r.status] = r.count; });

  return {
    totalBookings: allTimeTotals.rows[0].total_bookings,
    statusBreakdown,
    byFinancialYear: byYear.rows,
    feeRecovery: {
      feeExemptCancellations: feeStats.rows[0].fee_exempt_count,
      feeChargedCancellations: feeStats.rows[0].fee_charged_count,
      totalFeesCollectible: parseFloat(feeStats.rows[0].total_fees),
      averageFeePerCancellation: parseFloat(feeStats.rows[0].avg_fee),
    },
  };
}

module.exports = { getCancellations, getReports };
