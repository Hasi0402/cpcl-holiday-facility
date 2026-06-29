// src/services/cancellationService.js
// Implements the Holiday Home cancellation fee policy.

/**
 * Calculates cancellation fee based on days remaining before check-in.
 * Policy:
 *  >28 days        -> No fee
 *  21-28 days      -> ₹100 per room per night
 *  14-20 days      -> ₹200 per room per night
 *  7-13 days       -> ₹300 per room per night
 *  <7 days         -> Full recovery of booking amount
 *
 * @param {Date|string} checkInDate
 * @param {number} numRooms
 * @param {number} numNights
 * @param {number} [bookingAmount] - required only for "full recovery" tier
 * @returns {{ tier: string, daysRemaining: number, feeAmount: number, description: string }}
 */
function calculateCancellationFee(checkInDate, numRooms, numNights, bookingAmount = 0) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkIn = new Date(checkInDate);
  checkIn.setHours(0, 0, 0, 0);

  const daysRemaining = Math.ceil((checkIn - today) / (1000 * 60 * 60 * 24));

  let tier, perNightRate, feeAmount, description;

  if (daysRemaining > 28) {
    tier = "no_fee";
    feeAmount = 0;
    description = "No cancellation fee (more than 28 days before check-in).";
  } else if (daysRemaining >= 21) {
    tier = "tier_100";
    perNightRate = 100;
    feeAmount = perNightRate * numRooms * numNights;
    description = `₹100 per room per night × ${numRooms} room(s) × ${numNights} night(s) = ₹${feeAmount}`;
  } else if (daysRemaining >= 14) {
    tier = "tier_200";
    perNightRate = 200;
    feeAmount = perNightRate * numRooms * numNights;
    description = `₹200 per room per night × ${numRooms} room(s) × ${numNights} night(s) = ₹${feeAmount}`;
  } else if (daysRemaining >= 7) {
    tier = "tier_300";
    perNightRate = 300;
    feeAmount = perNightRate * numRooms * numNights;
    description = `₹300 per room per night × ${numRooms} room(s) × ${numNights} night(s) = ₹${feeAmount}`;
  } else {
    tier = "full_recovery";
    feeAmount = bookingAmount || 0;
    description = `Full recovery of booking amount (less than 7 days before check-in)${bookingAmount ? `: ₹${bookingAmount}` : ""}.`;
  }

  return { tier, daysRemaining, feeAmount, description };
}

/**
 * Determines if a cancellation is fee-exempt regardless of timing.
 * Per policy: CPRC rejection, hotel non-confirmation, hotel-side cancellation/failure.
 */
function isFeeExempt(reasonCode) {
  return ["cprc_rejection", "hotel_non_confirmation", "hotel_side_failure"].includes(reasonCode);
}

module.exports = { calculateCancellationFee, isFeeExempt };
