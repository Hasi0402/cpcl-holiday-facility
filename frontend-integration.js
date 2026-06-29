/* ============================================================================
   PHASE 8 — FRONTEND INTEGRATION
   ============================================================================
   This file replaces your localStorage-based data functions with real API
   calls to the backend built in Phases 1-7.

   HOW TO USE:
   1. Paste the contents of this file into your existing <script> block,
      replacing the old getBookings(), saveBookings(), getInbox(), saveInbox(),
      and triggerEmail() functions.
   2. Your HTML and CSS are untouched. The render*() functions that build
      HTML strings stay exactly as they are — only the *data source* changes,
      from localStorage reads to API responses.
   3. Search your file for every call to the old functions and follow the
      "BEFORE / AFTER" examples below for each view.
   ============================================================================ */

// ──────────────────────────────────────────────────────────────────────────
// 1. CONFIG + CORE FETCH HELPER
// ──────────────────────────────────────────────────────────────────────────
const API_BASE = "http://localhost:3000/api"; // change to your deployed backend URL in production

/**
 * Wraps fetch() with: JSON headers, automatic JWT attachment, and
 * consistent error handling (throws an Error with the server's message
 * on any non-2xx response, so existing try/catch blocks keep working).
 */
async function api(path, options = {}) {
  const token = localStorage.getItem("cpcl_token"); // ONLY the JWT lives in localStorage now — not app data

  const res = await fetch(API_BASE + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
      ...(options.headers || {}),
    },
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

// ──────────────────────────────────────────────────────────────────────────
// 2. AUTH — replaces the old hardcoded EMPLOYEES object + doLogin()
// ──────────────────────────────────────────────────────────────────────────

// BEFORE:
//   const emp = EMPLOYEES[id]; if (!emp || emp.password !== pass) { ... }
//   currentUser = { id, ...emp };
//
// AFTER:
async function doLogin() {
  const employeeId = document.getElementById("login-id").value.trim();
  const password = document.getElementById("login-pass").value;

  try {
    const { token, user } = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ employeeId, password }),
    });

    localStorage.setItem("cpcl_token", token); // only the token persists locally
    currentUser = user; // { id, name, email, role, grade, department }

    show("screen-app");
    hide("screen-login");
    await loadHotels();      // populate HOTELS before any view needs it
    buildNav();
    showView("dashboard");
  } catch (err) {
    document.getElementById("login-error").textContent = err.message;
    document.getElementById("login-error").classList.remove("hidden");
  }
}

function doSignout() {
  localStorage.removeItem("cpcl_token");
  currentUser = null;
  show("screen-login");
  hide("screen-app");
  document.getElementById("login-id").value = "";
  document.getElementById("login-pass").value = "";
  document.getElementById("login-error").classList.add("hidden");
}

// Optional: call on page load to restore a session if a valid token is already stored.
async function tryRestoreSession() {
  const token = localStorage.getItem("cpcl_token");
  if (!token) return false;
  try {
    const { user } = await api("/auth/me");
    currentUser = user;
    show("screen-app");
    hide("screen-login");
    await loadHotels();
    buildNav();
    showView("dashboard");
    return true;
  } catch {
    localStorage.removeItem("cpcl_token"); // expired/invalid — fall back to login screen
    return false;
  }
}

// ──────────────────────────────────────────────────────────────────────────
// 3. HOTELS — replaces the old hardcoded HOTELS array
// ──────────────────────────────────────────────────────────────────────────

// BEFORE: const HOTELS = [ {...hardcoded...} ];
// AFTER:
let HOTELS = [];

async function loadHotels() {
  const { hotels } = await api("/hotels");
  HOTELS = hotels; // same shape your renderEligible()/renderBook() already expect:
                    // { id, name, address, phone, email, website, airports, busStands,
                    //   railwayStations, packageDetails, complimentaryServices,
                    //   diningConcessions, nodalOfficer }
}
// Note: your old code used h.nodal — the API returns h.nodalOfficer. Either rename
// references in your render functions, or add this line after loadHotels():
//   HOTELS.forEach(h => h.nodal = h.nodalOfficer);

// ──────────────────────────────────────────────────────────────────────────
// 4. BOOKINGS — replaces getBookings() / saveBookings()
// ──────────────────────────────────────────────────────────────────────────

// BEFORE: function getBookings(){ return getData("bookings")||[] }
// AFTER (employee's own bookings):
async function getMyBookings() {
  const { bookings } = await api("/bookings/my");
  return bookings;
}

// BEFORE: quota check done client-side against localStorage bookings array
// AFTER:
async function getQuotaStatus() {
  return api("/bookings/quota/status"); // { currentYear, quota: { "2026-2027": {used,bookingId}, ... } }
}

// BEFORE:
//   const books = getBookings(); books.push(booking); saveBookings(books);
//   triggerEmail(...); triggerEmail(...);
//
// AFTER — submitBooking() becomes async; the server creates the row AND
// fires both emails (submitted + admin notify) in one call:
async function submitBooking() {
  const hotelId = document.getElementById("f-hotel").value;
  const hotelRef = document.getElementById("f-ref").value.trim();
  const checkIn = document.getElementById("f-checkin").value;
  const nightsEl = document.querySelector("input[name='nights']:checked");
  const numAdults = document.getElementById("f-adults").value;
  const numRooms = document.getElementById("f-rooms").value;
  const numChildren = document.getElementById("f-children").value;
  const purpose = document.getElementById("f-purpose").value;

  if (!hotelId || !hotelRef || !checkIn || !nightsEl || !numAdults || !numRooms) {
    alert("Please fill in all required fields.");
    return;
  }

  try {
    const { booking } = await api("/bookings", {
      method: "POST",
      body: JSON.stringify({
        hotelId: parseInt(hotelId),
        hotelRef,
        checkIn,
        nights: parseInt(nightsEl.value),
        numAdults: parseInt(numAdults),
        numChildren: parseInt(numChildren),
        numRooms: parseInt(numRooms),
        purpose,
      }),
    });
    alert("✅ Booking request submitted!\nBooking ID: " + booking.id + "\n\nCheck your Inbox for the confirmation email.");
    showView("mybookings");
  } catch (err) {
    // Quota violations, validation errors, etc. all surface here with the
    // exact message the server generated (e.g. "already used your booking for 2026-2027")
    alert("❌ " + err.message);
  }
}

// ──────────────────────────────────────────────────────────────────────────
// 5. CANCELLATION — replaces openCancel()/doCancel() localStorage logic
// ──────────────────────────────────────────────────────────────────────────

// BEFORE: fee calculated client-side in openCancel(), then doCancel() mutated localStorage
// AFTER: fee is calculated server-side (cannot be tampered with from devtools)
async function openCancel(bookingId) {
  try {
    const { preview } = await api(`/bookings/${bookingId}/cancellation-preview`);
    document.getElementById("cancel-fee-preview").innerHTML =
      `<strong>Cancellation fee estimate:</strong><br>${preview.description}`;
    document.getElementById("confirm-cancel-btn").onclick = () => doCancel(bookingId);
    show("cancel-overlay");
  } catch (err) {
    alert("❌ " + err.message);
  }
}

async function doCancel(bookingId) {
  try {
    const { feeDescription } = await api(`/bookings/${bookingId}/cancel`, {
      method: "PATCH",
      body: JSON.stringify({}), // pass { reasonCode: "cprc_rejection" } etc. for fee-exempt cancellations
    });
    closeModal("cancel-overlay");
    alert("Booking cancelled.\n" + feeDescription + "\n\nCancellation emails have been sent.");
    renderMyBookings();
  } catch (err) {
    alert("❌ " + err.message);
  }
}

// ──────────────────────────────────────────────────────────────────────────
// 6. INBOX — replaces getInbox()/saveInbox()/triggerEmail()
// ──────────────────────────────────────────────────────────────────────────
// triggerEmail() is DELETED entirely from the frontend — the backend sends
// every email itself (Phases 4, 5, 6), via Nodemailer, as a side effect of
// the create/approve/reject/cancel calls above. The frontend only ever
// *reads* a log of what was sent, for the Inbox tab:

// BEFORE: function getInbox(){ return getData("inbox")||[] }
// AFTER:
async function getInbox() {
  const { emails } = await api("/inbox"); // Note: requires the /api/inbox route from your
                                            // earlier prototype phase — keep it mounted in server.js
                                            // alongside the Phase 1-7 routes, or omit the Inbox tab
                                            // if you'd rather employees check real email only.
  return emails;
}

// ──────────────────────────────────────────────────────────────────────────
// 7. ADMIN — replaces adminAction()
// ──────────────────────────────────────────────────────────────────────────

async function getPendingBookings() {
  const { bookings } = await api("/admin/bookings/pending");
  return bookings;
}
async function getAllBookingsAdmin() {
  const { bookings } = await api("/admin/bookings");
  return bookings;
}

// BEFORE: adminAction(bookId, "Approved") / adminAction(bookId, "Rejected") mutated localStorage
// AFTER:
async function approveBooking(bookingId) {
  try {
    await api(`/admin/bookings/${bookingId}/approve`, { method: "PATCH" });
    alert(`Booking ${bookingId} approved. Confirmation email sent.`);
    renderAdmin();
  } catch (err) {
    alert("❌ " + err.message);
  }
}

async function rejectBooking(bookingId) {
  const reason = prompt("Reason for rejection (optional):") || "";
  try {
    await api(`/admin/bookings/${bookingId}/reject`, {
      method: "PATCH",
      body: JSON.stringify({ reason }),
    });
    alert(`Booking ${bookingId} rejected. Employee notified.`);
    renderAdmin();
  } catch (err) {
    alert("❌ " + err.message);
  }
}

// ──────────────────────────────────────────────────────────────────────────
// 8. FINANCE — replaces the localStorage-derived summary cards
// ──────────────────────────────────────────────────────────────────────────

async function getFinanceCancellations() {
  return api("/finance/cancellations"); // { cancellations: [...], totalFeesCollectible }
}
async function getFinanceReports() {
  return api("/finance/reports"); // { totalBookings, statusBreakdown, byFinancialYear, feeRecovery }
}

/* ============================================================================
   WHAT TO DO IN YOUR EXISTING render*() FUNCTIONS
   ============================================================================
   Each render function currently does something like:

     function renderMyBookings(){
       const books = getBookings().filter(b => b.empId === currentUser.id);
       el.innerHTML = `...${books.map(...)}...`;
     }

   Change the function signature to `async function renderMyBookings()` and
   replace the synchronous data line with an awaited API call:

     async function renderMyBookings(){
       const books = await getMyBookings();   // already filtered server-side by JWT identity
       el.innerHTML = `...${books.map(...)}...`;
     }

   Then update every CALLER of these functions to use `await` too
   (e.g. inside showView(), change `renders[v]()` to `await renders[v]()`,
   and mark showView itself `async`). Your HTML template strings and CSS
   classes do not need to change — only swap the data source line in each
   render function and thread `async/await` through the call chain above it.
   ============================================================================ */
