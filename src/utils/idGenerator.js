// src/utils/idGenerator.js

/** Generates a booking ID like "HH482931" — HH prefix + 6 timestamp digits + 2 random digits. */
function generateBookingId() {
  const timestampPart = Date.now().toString().slice(-6);
  const randomPart = Math.floor(Math.random() * 90 + 10); // 10-99
  return `HH${timestampPart}${randomPart}`;
}

module.exports = { generateBookingId };
