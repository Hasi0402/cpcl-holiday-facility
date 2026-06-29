// src/services/emailService.js
// All outbound email logic lives here.
// Uses Nodemailer. Configure SMTP in .env.

require("dotenv").config();
const nodemailer = require("nodemailer");
const pool = require("../db/pool");

// ── Transport ────────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ── Core send helper ─────────────────────────────────────────────────────────
async function sendEmail({ to, subject, html, text, bookingId, recipientType }) {
  let status = "sent";
  let errorMsg = null;
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || "CPCL Holiday Facility <noreply@cpcl.co.in>",
      to,
      subject,
      html,
      text,
    });
  } catch (err) {
    console.error("Email send failed:", err.message);
    status = "failed";
    errorMsg = err.message;
  }

  // Always log to DB regardless of success/failure
  try {
    await pool.query(
      `INSERT INTO email_log (booking_id, recipient, recipient_type, subject, body, status, error_msg)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [bookingId || null, to, recipientType || null, subject, text || html, status, errorMsg]
    );
  } catch (logErr) {
    console.error("Email log DB error:", logErr.message);
  }

  return status === "sent";
}

// ── Shared HTML wrapper ──────────────────────────────────────────────────────
function wrap(body) {
  return `
<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  body{font-family:Arial,sans-serif;background:#f5f5f2;margin:0;padding:20px}
  .card{background:#fff;border-radius:10px;max-width:600px;margin:0 auto;padding:32px;border:1px solid #e0ddd5}
  .header{background:#1A2744;color:#fff;border-radius:8px;padding:18px 24px;margin-bottom:24px}
  .header h2{margin:0;font-size:18px}
  .header p{margin:4px 0 0;font-size:13px;opacity:.7}
  .row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px dotted #e0ddd5;font-size:14px}
  .row:last-child{border-bottom:none}
  .label{color:#888}
  .val{font-weight:600;color:#1A2744}
  .notice{background:#fff3dc;border-left:3px solid #c8860a;padding:12px 16px;border-radius:6px;font-size:13px;color:#7a4f00;margin:16px 0}
  .footer{text-align:center;font-size:12px;color:#aaa;margin-top:24px}
  .badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700}
  .badge-approved{background:#e8f5ee;color:#1a6b3c}
  .badge-rejected{background:#fcebeb;color:#a32d2d}
  .badge-cancelled{background:#f0f0f0;color:#555}
  .badge-pending{background:#fff3dc;color:#7a4f00}
</style></head><body><div class="card">
${body}
<div class="footer">CPCL Holiday Facility Portal &mdash; Chennai Petroleum Corporation Limited<br>
This is an automated email. Please do not reply.</div>
</div></body></html>`;
}

// ── Template 1: Booking Submitted (to Employee) ──────────────────────────────
async function sendBookingSubmitted(booking, hotel, employee) {
  const subject = `Holiday Booking Submitted – ${booking.id}`;
  const html = wrap(`
<div class="header">
  <h2>Booking Request Submitted</h2>
  <p>Your request is pending IT department approval.</p>
</div>
<p style="font-size:15px">Dear <strong>${employee.name}</strong>,</p>
<p style="font-size:14px;color:#555">Your Holiday Facility booking request has been submitted successfully.</p>
<div class="row"><span class="label">Booking ID</span><span class="val">${booking.id}</span></div>
<div class="row"><span class="label">Status</span><span><span class="badge badge-pending">Pending Approval</span></span></div>
<div class="row"><span class="label">Hotel</span><span class="val">${hotel.name}</span></div>
<div class="row"><span class="label">Check-In</span><span class="val">${booking.check_in}</span></div>
<div class="row"><span class="label">Check-Out</span><span class="val">${booking.check_out} (${booking.nights} night${booking.nights > 1 ? "s" : ""})</span></div>
<div class="row"><span class="label">Rooms / Adults</span><span class="val">${booking.num_rooms} room${booking.num_rooms > 1 ? "s" : ""} / ${booking.num_adults} adults</span></div>
<div class="row"><span class="label">Hotel Reference</span><span class="val">${booking.hotel_ref}</span></div>
<div class="notice">You will receive another email once your booking is <strong>Approved</strong> or <strong>Rejected</strong> by the IT department.</div>`);

  const text = `Dear ${employee.name},\n\nYour booking request ${booking.id} has been submitted.\nHotel: ${hotel.name}\nCheck-In: ${booking.check_in} | Check-Out: ${booking.check_out}\nStatus: Pending Approval\n\nCPCL Holiday Facility Team`;
  return sendEmail({ to: employee.email, subject, html, text, bookingId: booking.id, recipientType: "employee" });
}

// ── Template 2: IT Admin notification for new booking ────────────────────────
async function sendAdminNewBooking(booking, hotel, employee) {
  const subject = `New Holiday Booking for Approval – ${booking.id}`;
  const html = wrap(`
<div class="header">
  <h2>New Booking Request – Action Required</h2>
  <p>Please review and approve or reject this request.</p>
</div>
<div class="row"><span class="label">Booking ID</span><span class="val">${booking.id}</span></div>
<div class="row"><span class="label">Employee</span><span class="val">${employee.name} (${employee.id})</span></div>
<div class="row"><span class="label">Role</span><span class="val">${employee.role}</span></div>
<div class="row"><span class="label">Hotel</span><span class="val">${hotel.name}</span></div>
<div class="row"><span class="label">Check-In</span><span class="val">${booking.check_in}</span></div>
<div class="row"><span class="label">Nights / Rooms</span><span class="val">${booking.nights} nights / ${booking.num_rooms} rooms</span></div>
<div class="row"><span class="label">Hotel Reference</span><span class="val">${booking.hotel_ref}</span></div>
<div class="notice">Log in to the CPCL Holiday Facility portal to <strong>Approve</strong> or <strong>Reject</strong> this request.</div>`);

  const text = `New booking ${booking.id} from ${employee.name} (${employee.id}) requires your approval.\nHotel: ${hotel.name}\nCheck-In: ${booking.check_in}\n\nLogin to the portal to review.`;
  return sendEmail({ to: process.env.IT_ADMIN_EMAIL, subject, html, text, bookingId: booking.id, recipientType: "admin" });
}

// ── Template 3: Booking Approved (to Employee) ───────────────────────────────
async function sendBookingApproved(booking, hotel, employee) {
  const subject = `Holiday Booking Approved ✓ – ${booking.id}`;
  const html = wrap(`
<div class="header" style="background:#1a6b3c">
  <h2>Booking Approved!</h2>
  <p>Your Holiday Home booking has been confirmed.</p>
</div>
<p style="font-size:15px">Dear <strong>${employee.name}</strong>,</p>
<p style="font-size:14px;color:#555">Great news! Your Holiday Facility booking has been <strong style="color:#1a6b3c">approved</strong>.</p>
<div class="row"><span class="label">Booking ID</span><span class="val">${booking.id}</span></div>
<div class="row"><span class="label">Status</span><span><span class="badge badge-approved">Approved</span></span></div>
<div class="row"><span class="label">Hotel</span><span class="val">${hotel.name}</span></div>
<div class="row"><span class="label">Address</span><span class="val" style="font-size:13px">${hotel.address}</span></div>
<div class="row"><span class="label">Hotel Phone</span><span class="val">${hotel.phone}</span></div>
<div class="row"><span class="label">Check-In</span><span class="val">${booking.check_in}</span></div>
<div class="row"><span class="label">Check-Out</span><span class="val">${booking.check_out} (${booking.nights} night${booking.nights > 1 ? "s" : ""})</span></div>
<div class="row"><span class="label">Rooms / Adults / Children</span><span class="val">${booking.num_rooms} / ${booking.num_adults} / ${booking.num_children}</span></div>
<div class="row"><span class="label">Hotel Reference</span><span class="val">${booking.hotel_ref}</span></div>
<div class="notice">Please carry this email or a printed copy of your booking slip when checking in at the hotel.</div>`);

  const text = `Dear ${employee.name},\n\nYour booking ${booking.id} has been APPROVED.\nHotel: ${hotel.name} | ${hotel.phone}\nCheck-In: ${booking.check_in} | Check-Out: ${booking.check_out}\n\nPlease carry this confirmation at check-in.\n\nCPCL IT Department`;
  return sendEmail({ to: employee.email, subject, html, text, bookingId: booking.id, recipientType: "employee" });
}

// ── Template 4: Booking Rejected (to Employee) ───────────────────────────────
async function sendBookingRejected(booking, hotel, employee, reason) {
  const subject = `Holiday Booking Rejected – ${booking.id}`;
  const html = wrap(`
<div class="header" style="background:#a32d2d">
  <h2>Booking Request Rejected</h2>
  <p>Your Holiday Home request was not approved.</p>
</div>
<p style="font-size:15px">Dear <strong>${employee.name}</strong>,</p>
<p style="font-size:14px;color:#555">We regret to inform you that your Holiday Facility booking request has been <strong style="color:#a32d2d">rejected</strong>.</p>
<div class="row"><span class="label">Booking ID</span><span class="val">${booking.id}</span></div>
<div class="row"><span class="label">Hotel</span><span class="val">${hotel.name}</span></div>
<div class="row"><span class="label">Check-In</span><span class="val">${booking.check_in}</span></div>
${reason ? `<div class="row"><span class="label">Reason</span><span class="val">${reason}</span></div>` : ""}
<div class="notice" style="background:#fcebeb;border-color:#a32d2d;color:#7a1f1f">As this was a CPRC rejection, <strong>no cancellation charges apply</strong>. Your annual quota has been restored and you may submit a fresh booking request.</div>
<p style="font-size:13px;color:#888">Please contact HR for further clarification.</p>`);

  const text = `Dear ${employee.name},\n\nYour booking ${booking.id} has been REJECTED.\nHotel: ${hotel.name} | Check-In: ${booking.check_in}\n${reason ? "Reason: " + reason + "\n" : ""}\nNo cancellation charges apply. Your quota has been restored.\n\nCPCL IT Department`;
  return sendEmail({ to: employee.email, subject, html, text, bookingId: booking.id, recipientType: "employee" });
}

// ── Template 5: Booking Cancelled (to Employee) ──────────────────────────────
async function sendBookingCancelled(booking, hotel, employee, feeDesc) {
  const subject = `Holiday Booking Cancelled – ${booking.id}`;
  const html = wrap(`
<div class="header" style="background:#555">
  <h2>Booking Cancelled</h2>
  <p>Your Holiday Home booking has been cancelled.</p>
</div>
<p style="font-size:15px">Dear <strong>${employee.name}</strong>,</p>
<div class="row"><span class="label">Booking ID</span><span class="val">${booking.id}</span></div>
<div class="row"><span class="label">Hotel</span><span class="val">${hotel.name}</span></div>
<div class="row"><span class="label">Original Check-In</span><span class="val">${booking.check_in}</span></div>
<div class="row"><span class="label">Cancelled On</span><span class="val">${new Date().toLocaleDateString("en-IN")}</span></div>
<div class="notice"><strong>Cancellation Fee:</strong> ${feeDesc}</div>
<p style="font-size:13px;color:#888">If you believe this cancellation was in error, please contact HR immediately.</p>`);

  const text = `Dear ${employee.name},\n\nYour booking ${booking.id} has been cancelled.\nHotel: ${hotel.name} | Check-In: ${booking.check_in}\nCancellation Fee: ${feeDesc}\n\nCPCL Holiday Facility Team`;
  return sendEmail({ to: employee.email, subject, html, text, bookingId: booking.id, recipientType: "employee" });
}

// ── Template 6: Cancellation Fee Notice (to Finance) ─────────────────────────
async function sendFinanceCancellationNotice(booking, hotel, employee, feeDesc, feeAmount) {
  const subject = `Cancellation Fee Notice – ${booking.id} (${employee.name})`;
  const html = wrap(`
<div class="header" style="background:#854f0b">
  <h2>Cancellation Fee – Action Required</h2>
  <p>A Holiday Home booking has been cancelled with applicable charges.</p>
</div>
<p style="font-size:14px;color:#555">Please process the following cancellation fee as per the Holiday Home policy.</p>
<div class="row"><span class="label">Booking ID</span><span class="val">${booking.id}</span></div>
<div class="row"><span class="label">Employee</span><span class="val">${employee.name} (${employee.id})</span></div>
<div class="row"><span class="label">Department</span><span class="val">${employee.department || "—"}</span></div>
<div class="row"><span class="label">Hotel</span><span class="val">${hotel.name}</span></div>
<div class="row"><span class="label">Check-In</span><span class="val">${booking.check_in}</span></div>
<div class="row"><span class="label">Nights / Rooms</span><span class="val">${booking.nights} / ${booking.num_rooms}</span></div>
<div class="row"><span class="label">Cancellation Date</span><span class="val">${new Date().toLocaleDateString("en-IN")}</span></div>
<div class="row"><span class="label">Cancellation Fee</span><span class="val" style="color:#854f0b;font-size:16px">${feeAmount ? "₹" + feeAmount.toLocaleString("en-IN") : feeDesc}</span></div>
<div class="notice">Please deduct the above amount from the employee's salary or process as per the applicable financial procedure.</div>`);

  const text = `Cancellation fee for booking ${booking.id} (${employee.name}, ${employee.id}).\nHotel: ${hotel.name} | Check-In: ${booking.check_in}\nFee: ${feeAmount ? "₹" + feeAmount : feeDesc}\n\nPlease process as per Holiday Home policy.`;
  return sendEmail({ to: process.env.FINANCE_EMAIL, subject, html, text, bookingId: booking.id, recipientType: "finance" });
}

module.exports = {
  sendBookingSubmitted,
  sendAdminNewBooking,
  sendBookingApproved,
  sendBookingRejected,
  sendBookingCancelled,
  sendFinanceCancellationNotice,
};
