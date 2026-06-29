// src/routes/financeRoutes.js
// PHASE 7 — Finance: GET /api/finance/cancellations, GET /api/finance/reports
// Restricted to role = 'Finance' (IT Admin also allowed read access for oversight).

const express = require("express");
const financeController = require("../controllers/financeController");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(requireAuth, requireRole("Finance", "IT Admin"));

router.get("/cancellations", financeController.getCancellations);
router.get("/reports", financeController.getReports);

module.exports = router;
