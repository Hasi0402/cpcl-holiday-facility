# Phase 9 — Testing Guide

Import `postman/CPCL_Holiday_Facility.postman_collection.json` into Postman.
Variables (`baseUrl`, `token`, `adminToken`, `financeToken`, `bookingId`, `hotelId`)
auto-populate as you run requests in order — run folder **"1. Auth"** first.

---

## Sample Requests & Responses

### POST /api/auth/login
**Request**
```json
{ "employeeId": "EMP001", "password": "pass" }
```
**Response — 200**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "EMP001",
    "name": "Rajesh Kumar",
    "email": "rajesh.kumar@cpcl.co.in",
    "role": "Supervisor",
    "grade": "E4",
    "department": "Operations"
  }
}
```
**Response — 401 (wrong password)**
```json
{ "error": "Invalid Employee ID or password." }
```

---

### GET /api/hotels
**Response — 200**
```json
{
  "hotels": [
    {
      "id": 1,
      "name": "Hotel Kodai International",
      "address": "17/32b, Laws Ghat Rd, Kodaikanal, Tamil Nadu 624101",
      "phone": "9944045190 / 9443045190",
      "email": "spaask@gmail.com",
      "website": "https://www.hkicodai.com",
      "airports": [{ "name": "Madurai Airport", "km": 135 }],
      "busStands": [{ "name": "Kodaikanal Bus Stand", "km": 1.5 }],
      "railwayStations": [{ "name": "Palani Railway Station", "km": 65 }],
      "packageDetails": ["Check-in time is 12:00 hrs", "..."],
      "complimentaryServices": ["Complimentary breakfast for guests", "..."],
      "diningConcessions": ["15% Discount on Food at in-house restaurant"],
      "nodalOfficer": { "name": "Veeramani Selvam", "phone": "...", "email": "..." }
    }
  ]
}
```

---

### POST /api/bookings
**Request**
```json
{
  "hotelId": 1,
  "hotelRef": "REF-2026-001",
  "checkIn": "2026-08-10",
  "nights": 3,
  "numAdults": 4,
  "numChildren": 1,
  "numRooms": 2,
  "purpose": "Family vacation, extra bed requested"
}
```
**Response — 201**
```json
{
  "booking": {
    "id": "HH48293112",
    "employee_id": "EMP001",
    "hotel_id": 1,
    "hotel_ref": "REF-2026-001",
    "financial_year": "2026-2027",
    "check_in": "2026-08-10",
    "check_out": "2026-08-13",
    "nights": 3,
    "num_adults": 4,
    "num_children": 1,
    "num_rooms": 2,
    "status": "Pending",
    "submitted_at": "2026-06-20T08:15:00.000Z"
  },
  "message": "Booking request submitted successfully."
}
```
**Response — 409 (quota already used)**
```json
{ "error": "You have already used your Holiday Facility booking for 2026-2027. Only one booking is allowed per financial year." }
```
**Response — 400 (validation)**
```json
{ "error": "Number of adults must be between 1 and 5." }
```

---

### PATCH /api/admin/bookings/:id/approve
**Response — 200**
```json
{
  "booking": { "id": "HH48293112", "status": "Approved", "reviewed_by": "ADMIN01", "...": "..." },
  "message": "Booking approved and confirmation email sent."
}
```
**Response — 403 (non-admin caller)**
```json
{ "error": "You do not have permission to perform this action." }
```

---

### PATCH /api/bookings/:id/cancel
**Request (>28 days out — no fee)**
```json
{}
```
**Response — 200**
```json
{
  "booking": { "id": "HH48293112", "status": "Cancelled", "cancellation_fee_amount": "0.00", "...": "..." },
  "feeDescription": "No cancellation fee (more than 28 days before check-in).",
  "feeAmount": 0,
  "message": "Booking cancelled successfully."
}
```
**Request (5 days out — full recovery)**
```json
{ "bookingAmount": 9000 }
```
**Response — 200**
```json
{
  "feeDescription": "Full recovery of booking amount (less than 7 days before check-in): ₹9000.",
  "feeAmount": 9000,
  "message": "Booking cancelled successfully."
}
```

---

### GET /api/finance/reports
**Response — 200**
```json
{
  "totalBookings": 14,
  "statusBreakdown": { "Pending": 2, "Approved": 8, "Rejected": 1, "Cancelled": 3 },
  "byFinancialYear": [
    { "financial_year": "2026-2027", "total_bookings": 10, "approved": 6, "rejected": 1, "cancelled": 2, "pending": 1 },
    { "financial_year": "2027-2028", "total_bookings": 4, "approved": 2, "rejected": 0, "cancelled": 1, "pending": 1 }
  ],
  "feeRecovery": {
    "feeExemptCancellations": 1,
    "feeChargedCancellations": 2,
    "totalFeesCollectible": 1400,
    "averageFeePerCancellation": 700
  }
}
```

---

## Test Checklist

### Auth
- [ ] Login with valid Supervisor credentials → 200 + token
- [ ] Login with valid Non-Supervisor credentials → 200 + token
- [ ] Login with valid IT Admin credentials → 200 + token
- [ ] Login with valid Finance credentials → 200 + token
- [ ] Login with wrong password → 401, generic message (doesn't leak whether ID exists)
- [ ] Login with non-existent employee ID → 401, same generic message
- [ ] 11th login attempt within 15 min from same IP → 429 rate limited
- [ ] GET /auth/me with valid token → 200 + user
- [ ] GET /auth/me with no token → 401
- [ ] GET /auth/me with expired/garbage token → 401

### Hotels
- [ ] GET /hotels without auth → 401
- [ ] GET /hotels with auth → 200, array includes airports/busStands/railwayStations/packages/nodalOfficer
- [ ] GET /hotels/:id for valid ID → 200
- [ ] GET /hotels/:id for invalid ID → 404

### Bookings
- [ ] Create booking with all valid fields → 201
- [ ] Create second booking same FY → 409 (quota exhausted)
- [ ] Create booking with nights = 4 → 400
- [ ] Create booking with numAdults = 0 or 6 → 400
- [ ] Create booking with numRooms = 3 → 400
- [ ] Create booking with checkIn in the past → 400
- [ ] Create booking as IT Admin or Finance role → 403 (role-restricted)
- [ ] Fire 2 simultaneous create-booking requests for the same employee/FY → only one succeeds (race condition test — confirms `FOR UPDATE` lock works)
- [ ] GET /bookings/my → only returns the logged-in employee's bookings
- [ ] GET /bookings/:id for someone else's booking → 403
- [ ] GET /bookings/quota/status → correct used/unused flags for both FYs
- [ ] Confirm "booking submitted" email logged/sent to employee
- [ ] Confirm "new booking" email logged/sent to IT admin

### Admin
- [ ] GET /admin/bookings/pending as Employee → 403
- [ ] GET /admin/bookings/pending as IT Admin → 200, only Pending rows, oldest first
- [ ] Approve a Pending booking → 200, status becomes Approved, approval email sent
- [ ] Approve an already-Approved booking → 409
- [ ] Reject a Pending booking with reason → 200, status becomes Rejected, quota restored, rejection email sent
- [ ] Verify employee can immediately create a new booking for the same FY after rejection (quota restore confirmed)
- [ ] Approve/Reject as non-IT-Admin role → 403

### Cancellation
- [ ] Cancel booking >28 days before check-in → fee = 0, no Finance email triggered
- [ ] Cancel booking 21-28 days before check-in → fee = ₹100/room/night, Finance email triggered
- [ ] Cancel booking 14-20 days before → fee = ₹200/room/night
- [ ] Cancel booking 7-13 days before → fee = ₹300/room/night
- [ ] Cancel booking <7 days before → full recovery
- [ ] Cancel with reasonCode = cprc_rejection → fee = 0 regardless of date, quota restored
- [ ] Cancel someone else's booking → 404 (ownership-scoped query, doesn't leak existence)
- [ ] Cancel an already-Cancelled or Rejected booking → 409
- [ ] GET cancellation-preview before confirming → fee estimate matches what /cancel later charges

### Finance
- [ ] GET /finance/cancellations as Employee → 403
- [ ] GET /finance/cancellations as Finance → 200, only fee > 0 rows
- [ ] GET /finance/reports as Finance → 200, totals match manually-counted DB rows
- [ ] GET /finance/reports as IT Admin → 200 (dual access allowed)

### Cross-cutting
- [ ] All error responses follow `{ "error": "..." }` shape consistently
- [ ] CORS rejects requests from an origin not in FRONTEND_URL (when not `*`)
- [ ] Server restarts cleanly; `/api/health` responds immediately after boot
- [ ] Audit log row created for: LOGIN, BOOK_SUBMIT, APPROVE, REJECT, CANCEL
