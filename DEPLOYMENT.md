# Phase 10 — Deployment Guide

## Project Structure

```
cpcl-backend-v2/
├── src/
│   ├── controllers/        # HTTP layer — parse req, call service, shape res
│   │   ├── authController.js
│   │   ├── hotelController.js
│   │   ├── bookingController.js
│   │   ├── cancellationController.js
│   │   ├── adminController.js
│   │   └── financeController.js
│   ├── routes/              # Express routers — URL → controller wiring + middleware
│   │   ├── authRoutes.js
│   │   ├── hotelRoutes.js
│   │   ├── bookingRoutes.js
│   │   ├── adminRoutes.js
│   │   └── financeRoutes.js
│   ├── services/            # Business logic + DB queries — the only layer touching pool.query
│   │   ├── authService.js
│   │   ├── hotelService.js
│   │   ├── bookingService.js
│   │   ├── cancellationFlowService.js
│   │   ├── cancellationService.js      (fee calculation — unchanged from earlier build)
│   │   ├── financialYearService.js     (FY helpers — unchanged)
│   │   ├── adminService.js
│   │   ├── financeService.js
│   │   └── emailService.js             (Nodemailer + all templates — unchanged)
│   ├── middleware/
│   │   ├── authMiddleware.js           (requireAuth, requireRole)
│   │   └── errorHandler.js             (asyncHandler, ApiError, global handler)
│   ├── db/
│   │   ├── pool.js                     (pg Pool — unchanged)
│   │   ├── migrate.js                  (unchanged — schema NOT redesigned)
│   │   └── seed.js                     (unchanged)
│   ├── utils/
│   │   └── idGenerator.js              (booking ID generation)
│   └── server.js                       (Phase 1 — app bootstrap)
├── postman/
│   └── CPCL_Holiday_Facility.postman_collection.json
├── frontend-integration.js             (Phase 8 — paste into your existing HTML)
├── TESTING.md                          (Phase 9)
├── package.json
└── .env.example
```

## PostgreSQL Setup

```bash
# 1. Create the database (skip if it already exists from your earlier work)
createdb cpcl_holiday

# 2. Run migrations (idempotent — safe even if tables already exist)
npm run db:migrate

# 3. Seed demo data (idempotent — uses ON CONFLICT DO NOTHING)
npm run db:seed
```

For production, point `DB_HOST`/`DB_USER`/`DB_PASSWORD` at a managed instance
(e.g. AWS RDS, Supabase, Neon, Railway Postgres) rather than a self-hosted server —
managed instances handle backups, failover, and patching for you.

## Backend Deployment Steps

These steps work for Railway, Render, Fly.io, or a plain VPS — adjust as needed.

1. **Push code to a Git repository** (GitHub/GitLab). Ensure `.env` is in `.gitignore`
   — never commit real credentials.
2. **Provision PostgreSQL** on your hosting platform, or use an external managed DB.
3. **Set environment variables** in your hosting platform's dashboard, matching `.env.example`:
   `PORT`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`,
   `JWT_EXPIRES_IN`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`,
   `IT_ADMIN_EMAIL`, `FINANCE_EMAIL`, `FRONTEND_URL`.
4. **Set the build/start commands**:
   - Build: `npm install`
   - Start: `npm start`
   - One-time post-deploy: `npm run db:migrate && npm run db:seed` (run once, not on every deploy — seed uses `ON CONFLICT DO NOTHING` so re-running is harmless, but you generally don't want migrate firing on every restart in CI/CD — run it manually or as a separate release step)
5. **Enable HTTPS** — most platforms (Railway, Render, Fly.io) provision this automatically
   on their default domain. If self-hosting, put Nginx + Certbot (Let's Encrypt) in front
   of the Node process.
6. **Verify**: hit `https://your-backend-domain/api/health` — should return `{"status":"ok",...}`.
7. **Smoke-test with Postman** against the production URL (change `baseUrl` variable),
   running through the Phase 9 checklist's critical paths (login, create booking, approve, cancel).

## Frontend Deployment Steps

The frontend is a single static HTML file with embedded CSS/JS (per your existing prototype).

1. In `frontend-integration.js` (or wherever you paste it into your HTML), set:
   ```javascript
   const API_BASE = "https://your-backend-domain/api";
   ```
2. Deploy the static HTML anywhere that serves static files:
   - **Netlify / Vercel**: drag-and-drop the HTML file, or connect the Git repo.
   - **GitHub Pages**: push to a repo, enable Pages on the `main` branch.
   - **Same server as backend**: have Express serve it via `express.static()` and skip CORS entirely (same-origin).
3. Update the backend's `FRONTEND_URL` env var to the deployed frontend's exact origin
   (e.g. `https://cpcl-holiday.netlify.app`) so CORS allows it. Comma-separate multiple
   origins if you need both a staging and production frontend URL.
4. Re-test login + booking flow against the live deployed pair (not localhost) before
   handing off to real CPCL employees.

## Production Security Checklist

- [ ] `JWT_SECRET` is a long random string (`openssl rand -hex 32`), unique per environment, never committed to Git
- [ ] `.env` is in `.gitignore`; secrets are set via the hosting platform's env var UI, not files in the repo
- [ ] `NODE_ENV=production` is set (some libraries change behavior/logging based on this)
- [ ] Database user has only the privileges this app needs — not a Postgres superuser
- [ ] Database connections use SSL if the DB is hosted remotely (`ssl: { rejectUnauthorized: false }` or platform-specific config in `pool.js` — check your provider's docs, e.g. Supabase/Neon require this)
- [ ] `FRONTEND_URL` is set to the exact production origin(s) — not `*` — once you're past local development
- [ ] Login rate limiting (`loginLimiter`, 10 attempts/15min) is active and tested
- [ ] Global rate limiting (`globalLimiter`, 300 req/15min) is active
- [ ] Passwords are bcrypt-hashed (already true via `seed.js`/`authService.js`) — never store plaintext
- [ ] HTTPS is enforced end-to-end (frontend → backend, backend → DB if remote)
- [ ] Error responses never leak stack traces or internal details to the client (`errorHandler.js` already strips this for non-operational errors — verify in production mode)
- [ ] SMTP credentials are an app-specific password or dedicated transactional email service (SendGrid, SES, Mailgun) — not a personal email password
- [ ] Audit log (`audit_log` table) is periodically reviewed for anomalous login/approval patterns
- [ ] Employee accounts are provisioned/deprovisioned through a real HR sync or admin process — not the seed script — before go-live
- [ ] A backup strategy exists for the PostgreSQL database (most managed providers offer automatic daily backups — confirm it's enabled)
- [ ] CORS `credentials: true` is only paired with explicit origins, never with `origin: "*"` (already structured correctly in `server.js`, just confirm `FRONTEND_URL` is set before launch)
- [ ] Dependency versions are kept current (`npm audit` run periodically)
