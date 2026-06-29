# CPCL Holiday Facility — Backend (Phases 1–10)

Continues your existing progress — **schema unchanged**. This package adds the
layered controller/service architecture and remaining endpoints on top of the
PostgreSQL schema, migrations, seed data, JWT middleware, email service,
connection pooling, and audit logging you already built.

## What's New in This Package

| Phase | Contents |
|-------|----------|
| 1 | `src/server.js`, `src/middleware/errorHandler.js` — Express bootstrap, CORS, rate limiting, centralized error handling |
| 2 | `src/routes/authRoutes.js`, `controllers/authController.js`, `services/authService.js` — login + /me |
| 3 | `src/routes/hotelRoutes.js`, `controllers/hotelController.js`, `services/hotelService.js` |
| 4 | `src/routes/bookingRoutes.js`, `controllers/bookingController.js`, `services/bookingService.js` |
| 5 | `src/routes/adminRoutes.js`, `controllers/adminController.js`, `services/adminService.js` |
| 6 | `controllers/cancellationController.js`, `services/cancellationFlowService.js` (wraps your existing `cancellationService.js` fee calculator, unchanged) |
| 7 | `src/routes/financeRoutes.js`, `controllers/financeController.js`, `services/financeService.js` |
| 8 | `frontend-integration.js` — drop-in replacement for your localStorage functions |
| 9 | `postman/CPCL_Holiday_Facility.postman_collection.json`, `TESTING.md` |
| 10 | `DEPLOYMENT.md`, `.env.example` |

**Carried over unchanged** (your existing work, copied as-is into this structure):
`src/db/pool.js`, `src/db/migrate.js`, `src/db/seed.js`, `src/services/emailService.js`,
`src/services/cancellationService.js`, `src/services/financialYearService.js`.

## Architecture Pattern

Every feature follows the same three-layer split, per your phase spec:

```
Route (URL + middleware wiring)
  → Controller (HTTP: parse req, call service, shape res, no DB/business logic)
    → Service (business logic + DB queries — the only layer that touches pool.query)
```

`asyncHandler()` wraps every controller method so thrown/rejected errors flow
into the single global `errorHandler` — no repeated try/catch boilerplate.
`ApiError(statusCode, message)` is how services signal intentional 4xx errors
(quota exceeded, not found, wrong role, etc.) up to that handler.

## Quick Start

```bash
npm install
cp .env.example .env        # fill in your DB + SMTP credentials
npm run db:migrate          # safe to re-run — IF NOT EXISTS guards
npm run db:seed             # safe to re-run — ON CONFLICT DO NOTHING
npm run dev
```

Then import `postman/CPCL_Holiday_Facility.postman_collection.json` and run
the "1. Auth → Login - Employee" request first to get a working session.

See `TESTING.md` for the full endpoint reference and test checklist, and
`DEPLOYMENT.md` for going to production.

## Wiring Your Existing Frontend

Open `frontend-integration.js` — it's written as a direct map from your current
`getBookings()` / `saveBookings()` / `triggerEmail()` functions to the new API
calls, with BEFORE/AFTER comments at each one. Your HTML and CSS are not touched;
only the data-source lines inside your existing `render*()` functions change,
and those functions become `async`. No UI redesign.
