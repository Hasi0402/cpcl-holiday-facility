// src/db/migrate.js
// Run: node src/db/migrate.js
// Creates all tables in order. Safe to run multiple times (IF NOT EXISTS).

require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const migrations = [
  // ── 1. EMPLOYEES ────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS employees (
    id            VARCHAR(20) PRIMARY KEY,          -- e.g. EMP001
    name          VARCHAR(120) NOT NULL,
    email         VARCHAR(120) NOT NULL UNIQUE,
    password_hash VARCHAR(200) NOT NULL,
    role          VARCHAR(30)  NOT NULL              -- Supervisor | Non-Supervisor | IT Admin | Finance
                  CHECK (role IN ('Supervisor','Non-Supervisor','IT Admin','Finance')),
    grade         VARCHAR(10),                       -- E4, W3, etc.
    department    VARCHAR(80),
    is_active     BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
  )`,

  // ── 2. HOTELS ────────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS hotels (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(150) NOT NULL,
    address       TEXT NOT NULL,
    phone         VARCHAR(60),
    email         VARCHAR(120),
    website       VARCHAR(200),
    is_active     BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMPTZ DEFAULT NOW()
  )`,

  // ── 3. HOTEL_DISTANCES ───────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS hotel_distances (
    id            SERIAL PRIMARY KEY,
    hotel_id      INT NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    type          VARCHAR(20) NOT NULL               -- airport | bus_stand | railway_station
                  CHECK (type IN ('airport','bus_stand','railway_station')),
    name          VARCHAR(150) NOT NULL,
    distance_km   NUMERIC(7,1) NOT NULL
  )`,

  // ── 4. HOTEL_PACKAGES ───────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS hotel_packages (
    id            SERIAL PRIMARY KEY,
    hotel_id      INT NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    category      VARCHAR(30) NOT NULL               -- package_detail | complimentary | dining
                  CHECK (category IN ('package_detail','complimentary','dining')),
    description   TEXT NOT NULL,
    sort_order    INT DEFAULT 0
  )`,

  // ── 5. HOTEL_NODAL_OFFICERS ─────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS hotel_nodal_officers (
    id            SERIAL PRIMARY KEY,
    hotel_id      INT NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    name          VARCHAR(120) NOT NULL,
    phone         VARCHAR(60),
    email         VARCHAR(120)
  )`,

  // ── 6. BOOKING_QUOTAS ───────────────────────────────────────────────────────
  // One row per employee per financial year – tracks eligibility
  `CREATE TABLE IF NOT EXISTS booking_quotas (
    id            SERIAL PRIMARY KEY,
    employee_id   VARCHAR(20) NOT NULL REFERENCES employees(id),
    financial_year VARCHAR(9) NOT NULL,              -- e.g. 2026-2027
    is_used       BOOLEAN DEFAULT FALSE,
    booking_id    VARCHAR(20),                        -- FK set after booking created
    UNIQUE (employee_id, financial_year)
  )`,

  // ── 7. BOOKINGS ─────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS bookings (
    id              VARCHAR(20) PRIMARY KEY,          -- HH + timestamp tail e.g. HH123456
    employee_id     VARCHAR(20) NOT NULL REFERENCES employees(id),
    hotel_id        INT NOT NULL REFERENCES hotels(id),
    hotel_ref       VARCHAR(80) NOT NULL,             -- reference no. from hotel call
    financial_year  VARCHAR(9)  NOT NULL,
    check_in        DATE NOT NULL,
    check_out       DATE NOT NULL,
    nights          SMALLINT NOT NULL CHECK (nights BETWEEN 1 AND 3),
    num_adults      SMALLINT NOT NULL CHECK (num_adults BETWEEN 1 AND 5),
    num_children    SMALLINT NOT NULL DEFAULT 0 CHECK (num_children BETWEEN 0 AND 4),
    num_rooms       SMALLINT NOT NULL CHECK (num_rooms BETWEEN 1 AND 2),
    purpose         TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'Pending'
                    CHECK (status IN ('Pending','Approved','Rejected','Cancelled')),
    -- Approval
    reviewed_by     VARCHAR(20) REFERENCES employees(id),
    reviewed_at     TIMESTAMPTZ,
    rejection_reason TEXT,
    -- Cancellation
    cancelled_at    TIMESTAMPTZ,
    cancellation_fee_desc TEXT,
    cancellation_fee_amount NUMERIC(10,2),
    -- Audit
    submitted_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
  )`,

  // ── 8. EMAIL_LOG ────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS email_log (
    id            SERIAL PRIMARY KEY,
    booking_id    VARCHAR(20) REFERENCES bookings(id),
    recipient     VARCHAR(120) NOT NULL,
    recipient_type VARCHAR(20),                       -- employee | admin | finance
    subject       VARCHAR(250) NOT NULL,
    body          TEXT NOT NULL,
    status        VARCHAR(20) DEFAULT 'sent'
                  CHECK (status IN ('sent','failed','queued')),
    error_msg     TEXT,
    sent_at       TIMESTAMPTZ DEFAULT NOW()
  )`,

  // ── 9. AUDIT_LOG ─────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS audit_log (
    id            SERIAL PRIMARY KEY,
    actor_id      VARCHAR(20),
    action        VARCHAR(80) NOT NULL,               -- LOGIN | BOOK | CANCEL | APPROVE | REJECT
    entity_type   VARCHAR(30),
    entity_id     VARCHAR(30),
    details       JSONB,
    ip_address    VARCHAR(45),
    created_at    TIMESTAMPTZ DEFAULT NOW()
  )`,

  // ── Indexes ──────────────────────────────────────────────────────────────────
  `CREATE INDEX IF NOT EXISTS idx_bookings_employee ON bookings(employee_id)`,
  `CREATE INDEX IF NOT EXISTS idx_bookings_status   ON bookings(status)`,
  `CREATE INDEX IF NOT EXISTS idx_bookings_hotel    ON bookings(hotel_id)`,
  `CREATE INDEX IF NOT EXISTS idx_quota_emp_year    ON booking_quotas(employee_id, financial_year)`,
  `CREATE INDEX IF NOT EXISTS idx_email_log_booking ON email_log(booking_id)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_actor       ON audit_log(actor_id)`,
];

async function migrate() {
  const client = await pool.connect();
  try {
    console.log("▶ Running migrations...");
    for (const sql of migrations) {
      const label = sql.trim().split("\n")[0].slice(0, 70);
      await client.query(sql);
      console.log("  ✓", label);
    }
    console.log("\n✅ All migrations complete.");
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
