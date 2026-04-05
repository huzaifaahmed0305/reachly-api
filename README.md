# Reachly API

Backend for **Reachly** — a booking platform for Pakistani influencers to monetize 1-on-1 video calls with followers and clients.

Built with **Node.js + Express + Supabase**.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 18+ |
| Framework | Express.js |
| Database | Supabase (PostgreSQL) |
| Auth | JWT (jsonwebtoken) + bcrypt |
| Validation | express-validator |
| Security | helmet, cors, express-rate-limit |

---

## Project Structure

```
reachly/
├── src/
│   ├── index.js                  # App entry point
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── influencers.controller.js
│   │   ├── sessions.controller.js
│   │   ├── bookings.controller.js
│   │   └── dashboard.controller.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── influencers.js
│   │   ├── sessions.js
│   │   ├── bookings.js
│   │   └── dashboard.js
│   ├── middleware/
│   │   ├── auth.js               # JWT protect + requireRole
│   │   ├── errorHandler.js       # Global error handler + asyncHandler
│   │   └── validate.js           # express-validator middleware
│   └── utils/
│       ├── supabase.js           # Supabase clients (public + admin)
│       ├── jwt.js                # Sign / verify tokens
│       └── fees.js               # Platform fee calculator
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
├── .env.example
├── .gitignore
└── package.json
```

---

## Quick Start

### 1. Clone & install

```bash
git clone https://github.com/yourname/reachly-api.git
cd reachly-api
npm install
```

### 2. Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Open the **SQL Editor** and run the contents of `supabase/migrations/001_initial_schema.sql`
3. Copy your project URL and keys from **Settings → API**

### 3. Configure environment

```bash
cp .env.example .env
# Fill in your Supabase URL, keys, and JWT secret
```

### 4. Run

```bash
npm run dev       # Development (nodemon)
npm start         # Production
```

API will be live at `http://localhost:3000`

---

## API Reference

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | — | Register as influencer or follower |
| POST | `/api/auth/login` | — | Login, receive JWT |
| GET | `/api/auth/me` | JWT | Get current user |

#### Register body
```json
{
  "email": "sana@example.com",
  "password": "securepass123",
  "name": "Sana Amjad",
  "role": "influencer",
  "handle": "sanaamjad"
}
```

#### Login response
```json
{
  "token": "eyJhbGci...",
  "user": { "id": "uuid", "email": "...", "role": "influencer" }
}
```

---

### Influencers

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/influencers` | — | List all active influencers |
| GET | `/api/influencers/:handle` | — | Get profile + session types |
| GET | `/api/influencers/:handle/availability?date=YYYY-MM-DD` | — | Get open time slots |
| PUT | `/api/influencers/me/profile` | Influencer JWT | Update own profile |
| PUT | `/api/influencers/me/availability` | Influencer JWT | Set availability slots |

---

### Session Types

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/sessions/influencer/:influencerId` | — | List session types |
| POST | `/api/sessions` | Influencer JWT | Create session type |
| PUT | `/api/sessions/:id` | Influencer JWT | Update session type |
| DELETE | `/api/sessions/:id` | Influencer JWT | Soft-delete session type |

#### Create session type body
```json
{
  "title": "Quick Chat",
  "description": "Ask me anything about my journey.",
  "duration_minutes": 20,
  "price_pkr": 2500
}
```

---

### Bookings

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/bookings` | Follower JWT | Create a booking |
| GET | `/api/bookings` | JWT | Get my bookings |
| GET | `/api/bookings/:id` | JWT | Get single booking |
| PATCH | `/api/bookings/:id/confirm` | Influencer JWT | Confirm a pending booking |
| PATCH | `/api/bookings/:id/cancel` | JWT | Cancel a booking |

#### Create booking body
```json
{
  "session_type_id": "uuid",
  "influencer_id": "uuid",
  "scheduled_at": "2026-04-07T11:30:00+05:00",
  "payment_method": "jazzcash",
  "note": "I want to discuss content strategy"
}
```

#### Booking response includes fee breakdown
```json
{
  "booking": {
    "booking_ref": "RCH-A1B2C3D4",
    "gross_amount_pkr": 2500,
    "platform_fee_pkr": 250,
    "creator_payout_pkr": 2250,
    "status": "pending"
  }
}
```

---

### Dashboard (Influencer only)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/dashboard` | Influencer JWT | Full earnings + bookings overview |

#### Dashboard response
```json
{
  "metrics": {
    "upcoming_count": 7,
    "monthly_sessions": 34,
    "monthly_gross_pkr": 90000,
    "monthly_earnings_pkr": 81000,
    "monthly_platform_fee_pkr": 9000,
    "total_sessions_completed": 340,
    "total_earnings_pkr": 920000
  },
  "upcoming_sessions": [...],
  "recent_payouts": [...]
}
```

---

## Platform Fee Logic

```
Gross amount (follower pays) = session price
Platform fee                 = gross × 10%
Creator payout               = gross − platform fee
```

Change the fee % in `.env`:
```
PLATFORM_FEE_PERCENT=10
```

---

## Deployment

### Deploy to Railway (recommended for Pakistan)

```bash
# Install Railway CLI
npm install -g @railway/cli

railway login
railway init
railway up
```

Set environment variables in the Railway dashboard.

### Deploy to Render

1. Connect your GitHub repo at [render.com](https://render.com)
2. Set **Build command**: `npm install`
3. Set **Start command**: `npm start`
4. Add all `.env` variables in the Environment tab

---

## Roadmap

- [ ] JazzCash Merchant API integration
- [ ] EasyPaisa payment integration  
- [ ] WhatsApp booking notifications (Twilio)
- [ ] Auto-generate Google Meet links on confirmation
- [ ] Influencer payout dashboard (bank transfer)
- [ ] Admin panel — platform-wide analytics
- [ ] Review & rating system post-session
- [ ] Referral/promo code system

---

## License

MIT
