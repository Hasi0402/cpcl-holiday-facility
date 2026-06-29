// src/controllers/financeController.js
// PHASE 7 — Finance: HTTP layer for GET /api/finance/cancellations, GET /api/finance/reports

const financeService = require("../services/financeService");
const { asyncHandler } = require("../middleware/errorHandler");

// GET /api/finance/cancellations
const getCancellations = asyncHandler(async (req, res) => {
  const data = await financeService.getCancellations();
  res.status(200).json(data);
});

// GET /api/finance/reports
const getReports = asyncHandler(async (req, res) => {
  const data = await financeService.getReports();
  res.status(200).json(data);
});

module.exports = { getCancellations, getReports };
