// src/db/seed.js
// Run: node src/db/seed.js
// Seeds demo employees, hotels, packages, nodal officers.
// Safe to re-run – uses INSERT ... ON CONFLICT DO NOTHING.

require("dotenv").config();
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function seed() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    console.log("▶ Seeding database...\n");

    // ── EMPLOYEES ────────────────────────────────────────────────────────────
    const employees = [
      { id: "EMP001", name: "Rajesh Kumar",     email: "rajesh.kumar@cpcl.co.in",     pass: "pass",  role: "Supervisor",     grade: "E4", dept: "Operations" },
      { id: "EMP002", name: "Lakshmi Venkat",   email: "lakshmi.venkat@cpcl.co.in",   pass: "pass",  role: "Non-Supervisor", grade: "W3", dept: "Maintenance" },
      { id: "EMP003", name: "Anand Suresh",     email: "anand.suresh@cpcl.co.in",     pass: "pass",  role: "Supervisor",     grade: "E3", dept: "Finance" },
      { id: "EMP004", name: "Meena Krishnan",   email: "meena.krishnan@cpcl.co.in",   pass: "pass",  role: "Non-Supervisor", grade: "W2", dept: "HR" },
      { id: "ADMIN01", name: "IT Admin",        email: "itadmin@cpcl.co.in",          pass: "admin", role: "IT Admin",       grade: "",   dept: "IT" },
      { id: "FIN01",   name: "Finance Officer", email: "finance@cpcl.co.in",          pass: "fin",   role: "Finance",        grade: "",   dept: "Finance" },
    ];

    for (const e of employees) {
      const hash = await bcrypt.hash(e.pass, 10);
      await client.query(
        `INSERT INTO employees (id, name, email, password_hash, role, grade, department)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (id) DO NOTHING`,
        [e.id, e.name, e.email, hash, e.role, e.grade, e.dept]
      );
      console.log("  ✓ Employee:", e.id, e.name);
    }

    // ── HOTELS ───────────────────────────────────────────────────────────────
    const hotels = [
      {
        name: "Hotel Kodai International",
        address: "17/32b, Laws Ghat Rd, Kodaikanal, Tamil Nadu 624101",
        phone: "9944045190 / 9443045190",
        email: "spaask@gmail.com",
        website: "https://www.hkicodai.com",
        distances: [
          { type: "airport",          name: "Madurai Airport",          km: 135 },
          { type: "bus_stand",        name: "Kodaikanal Bus Stand",      km: 1.5 },
          { type: "railway_station",  name: "Palani Railway Station",    km: 65  },
        ],
        packages: [
          { category: "package_detail",  desc: "Check-in time is 12:00 hrs",                                                  sort: 1 },
          { category: "package_detail",  desc: "Early check-in may be requested in advance based on room availability",       sort: 2 },
          { category: "package_detail",  desc: "Check-out time is 10:00 hrs, extendable to 11:00 hrs free of charge",         sort: 3 },
          { category: "complimentary",   desc: "Complimentary breakfast for guests",                                           sort: 1 },
          { category: "complimentary",   desc: "Complimentary Wi-Fi internet access",                                          sort: 2 },
          { category: "complimentary",   desc: "Tea/Coffee making facilities in the room",                                     sort: 3 },
          { category: "complimentary",   desc: "Free daily English local newspaper",                                           sort: 4 },
          { category: "complimentary",   desc: "10% Discount on Laundry",                                                      sort: 5 },
          { category: "dining",          desc: "15% Discount on Food at in-house restaurant",                                  sort: 1 },
        ],
        nodal: { name: "Veeramani Selvam", phone: "9944045190 / 9443045190", email: "reservations@hkki.com" },
      },
      {
        name: "The Residency Hotel",
        address: "49, GN Chetty Road, T. Nagar, Chennai, Tamil Nadu 600017",
        phone: "044-28254434 / 9840123456",
        email: "reservations@theresidency.com",
        website: "https://www.theresidency.com",
        distances: [
          { type: "airport",          name: "Chennai International Airport", km: 16 },
          { type: "bus_stand",        name: "CMBT Bus Stand",                km: 5  },
          { type: "railway_station",  name: "Chennai Central",               km: 8  },
          { type: "railway_station",  name: "Chennai Egmore",                km: 7  },
        ],
        packages: [
          { category: "package_detail",  desc: "Check-in time is 14:00 hrs",                                    sort: 1 },
          { category: "package_detail",  desc: "Check-out time is 12:00 hrs",                                   sort: 2 },
          { category: "package_detail",  desc: "Early check-in subject to availability",                        sort: 3 },
          { category: "complimentary",   desc: "Complimentary breakfast for up to 2 adults",                    sort: 1 },
          { category: "complimentary",   desc: "Complimentary Wi-Fi in all rooms",                               sort: 2 },
          { category: "complimentary",   desc: "Welcome drink on arrival",                                       sort: 3 },
          { category: "complimentary",   desc: "5% Discount on Laundry",                                         sort: 4 },
          { category: "dining",          desc: "10% Discount on Food and Beverages at in-house restaurant",      sort: 1 },
        ],
        nodal: { name: "Priya Raghunathan", phone: "044-28254434", email: "nodal@theresidency.com" },
      },
      {
        name: "Ooty Mountview Resort",
        address: "Havelock Rd, Ooty, Tamil Nadu 643001",
        phone: "0423-2443660 / 9444012345",
        email: "info@ootymountview.com",
        website: "https://www.ootymountview.com",
        distances: [
          { type: "airport",          name: "Coimbatore International Airport", km: 88  },
          { type: "bus_stand",        name: "Ooty Bus Stand",                   km: 2   },
          { type: "railway_station",  name: "Ooty Railway Station",             km: 1.5 },
        ],
        packages: [
          { category: "package_detail",  desc: "Check-in time is 13:00 hrs",                              sort: 1 },
          { category: "package_detail",  desc: "Check-out time is 11:00 hrs",                             sort: 2 },
          { category: "package_detail",  desc: "Complimentary room upgrade subject to availability",      sort: 3 },
          { category: "complimentary",   desc: "Complimentary breakfast and evening snacks",               sort: 1 },
          { category: "complimentary",   desc: "Complimentary Wi-Fi in rooms and lobby",                   sort: 2 },
          { category: "complimentary",   desc: "Bonfire on request (seasonal)",                            sort: 3 },
          { category: "complimentary",   desc: "Free Tea/Coffee in room",                                  sort: 4 },
          { category: "dining",          desc: "20% Discount on Food at in-house restaurant",              sort: 1 },
          { category: "dining",          desc: "Complimentary welcome drink",                              sort: 2 },
        ],
        nodal: { name: "Karthik Subramaniam", phone: "0423-2443660", email: "reservations@ootymountview.com" },
      },
    ];

    for (const h of hotels) {
      const res = await client.query(
        `INSERT INTO hotels (name, address, phone, email, website)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [h.name, h.address, h.phone, h.email, h.website]
      );
      if (!res.rows.length) { console.log("  ↷ Hotel already exists:", h.name); continue; }
      const hotelId = res.rows[0].id;
      console.log(`  ✓ Hotel [${hotelId}]:`, h.name);

      for (const d of h.distances) {
        await client.query(
          `INSERT INTO hotel_distances (hotel_id, type, name, distance_km) VALUES ($1,$2,$3,$4)`,
          [hotelId, d.type, d.name, d.km]
        );
      }
      for (const p of h.packages) {
        await client.query(
          `INSERT INTO hotel_packages (hotel_id, category, description, sort_order) VALUES ($1,$2,$3,$4)`,
          [hotelId, p.category, p.desc, p.sort]
        );
      }
      await client.query(
        `INSERT INTO hotel_nodal_officers (hotel_id, name, phone, email) VALUES ($1,$2,$3,$4)`,
        [hotelId, h.nodal.name, h.nodal.phone, h.nodal.email]
      );
    }

    await client.query("COMMIT");
    console.log("\n✅ Seed complete.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Seed failed:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
