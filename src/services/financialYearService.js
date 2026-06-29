// src/services/financialYearService.js
// CPCL financial year runs April–March (standard Indian FY).

/**
 * Returns the current financial year string, e.g. "2026-2027"
 * for any date from 1-Apr-2026 to 31-Mar-2027.
 */
function getCurrentFinancialYear(date = new Date()) {
  const month = date.getMonth() + 1; // 1-12
  const year = date.getFullYear();
  if (month >= 4) {
    return `${year}-${year + 1}`;
  }
  return `${year - 1}-${year}`;
}

/**
 * Returns the financial year a given check-in date falls into.
 */
function getFinancialYearForDate(checkInDate) {
  return getCurrentFinancialYear(new Date(checkInDate));
}

/** List of financial years the system currently supports booking for. */
const SUPPORTED_YEARS = ["2026-2027", "2027-2028"];

module.exports = { getCurrentFinancialYear, getFinancialYearForDate, SUPPORTED_YEARS };
