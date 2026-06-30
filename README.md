# CPCL Holiday Facility Management System — Backend

A production-style REST API for the **CPCL Holiday Facility Management System**, built with **Node.js, Express.js, and PostgreSQL** using a layered **Route → Controller → Service** architecture.

The system enables employees to book CPCL holiday homes, while providing dedicated workflows for IT Admin approval, Finance management, booking cancellations, audit logging, and email notifications.

## Live Demo

**Frontend:** https://cpcl-holiday-facility-frontend.vercel.app

**Frontend Repository:**  
https://github.com/Hasi0402/cpcl-holiday-facility-frontend

# Features

### Authentication & Security

- JWT-based authentication
- Password hashing using bcrypt
- Role-based authorization
- Protected API routes
- Global API rate limiting
- Additional login rate limiting
- Audit logging for security-sensitive operations

### Employee Portal

- Browse available holiday homes
- View hotel amenities and package details
- Create holiday booking requests
- View booking history
- Cancel bookings
- Automatic cancellation fee calculation
- Financial-year booking quota enforcement

### IT Admin Portal

- Review pending booking requests
- Approve or reject bookings
- View all bookings
- Automatic quota restoration on rejected bookings

### Finance Portal

- View cancellation charges
- Booking statistics
- Financial-year reports
- Revenue and cancellation tracking

### Business Rules

- Maximum 3-night booking duration
- Maximum 5 adults
- Maximum 4 children
- Maximum 2 rooms
- One booking per employee per financial year
- PostgreSQL row-level locking to prevent concurrent quota violations

### Notifications

- HTML email notifications using Nodemailer
- Booking submitted
- Booking approved
- Booking rejected
- Booking cancelled

# Tech Stack

### Backend

- Node.js
- Express.js

### Database

- PostgreSQL
- pg

### Authentication

- JSON Web Token (JWT)
- bcryptjs

### Email

- Nodemailer

### Security

- express-rate-limit

# Project Structure

```
src
├── controllers/
├── services/
├── routes/
├── middleware/
├── db/
├── utils/
└── server.js
```

The project follows a layered architecture where:

- Routes define endpoints
- Controllers handle HTTP requests
- Services contain business logic
- Database layer manages PostgreSQL access

---

# Getting Started

Clone the repository

```bash
git clone https://github.com/Hasi0402/cpcl-holiday-facility.git
cd cpcl-holiday-facility
```

Install dependencies

```bash
npm install
```

Create the environment file

```bash
cp .env.example .env
```

Update the PostgreSQL and SMTP credentials inside `.env`.

Run database migrations

```bash
npm run db:migrate
```

Seed demo data

```bash
npm run db:seed
```

Start the development server

```bash
npm run dev
```

Health Check

```
GET /api/health
```

---

# Environment Variables

| Variable | Description |
|------------|-------------|
| PORT | API Port |
| DB_HOST | PostgreSQL Host |
| DB_PORT | PostgreSQL Port |
| DB_NAME | Database Name |
| DB_USER | Database User |
| DB_PASSWORD | Database Password |
| JWT_SECRET | JWT Signing Secret |
| JWT_EXPIRES_IN | Token Lifetime |
| SMTP_HOST | SMTP Host |
| SMTP_PORT | SMTP Port |
| SMTP_USER | SMTP Username |
| SMTP_PASS | SMTP Password |
| EMAIL_FROM | Sender Email |
| IT_ADMIN_EMAIL | IT Admin Email |
| FINANCE_EMAIL | Finance Email |
| FRONTEND_URL | Allowed Frontend Origin |

---

# Demo Accounts

| Employee ID | Password | Role |
|--------------|----------|----------------|
| EMP001 | pass | Supervisor |
| EMP002 | pass | Non-Supervisor |
| ADMIN01 | admin | IT Admin |
| FIN01 | fin | Finance |

---

# REST API

## Authentication

```
POST   /api/auth/login
GET    /api/auth/me
```

## Hotels

```
GET    /api/hotels
GET    /api/hotels/:id
```

## Bookings

```
POST   /api/bookings
GET    /api/bookings/my
GET    /api/bookings/:id
GET    /api/bookings/quota/status
```

## Cancellation

```
GET    /api/bookings/:id/cancellation-preview
PATCH  /api/bookings/:id/cancel
```

## IT Admin

```
GET    /api/admin/bookings
GET    /api/admin/bookings/pending
PATCH  /api/admin/bookings/:id/approve
PATCH  /api/admin/bookings/:id/reject
```

## Finance

```
GET    /api/finance/cancellations
GET    /api/finance/reports
```
# Deployment

The backend is deployed on **Render** using **Neon PostgreSQL**.

The frontend is deployed separately on **Vercel**.

# Highlights

- Layered backend architecture
- Production-style REST API
- JWT Authentication
- Role-based Authorization
- PostgreSQL Transactions
- Row-Level Locking
- Audit Logging
- Email Notifications
- Secure API Design
- Render + Neon + Vercel Deployment

# License
Academic project developed for the **Chennai Petroleum Corporation Limited (CPCL)** Holiday Facility Management System.
