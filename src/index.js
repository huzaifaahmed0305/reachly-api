import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'

import authRoutes        from './routes/auth.js'
import influencerRoutes  from './routes/influencers.js'
import sessionRoutes     from './routes/sessions.js'
import bookingRoutes     from './routes/bookings.js'
import dashboardRoutes   from './routes/dashboard.js'
import paymentRoutes     from './routes/payments.js'
import adminRoutes       from './routes/admin.js'
import { errorHandler }  from './middleware/errorHandler.js'
import availabilityRoutes from './routes/availability.js'

const app  = express()
const PORT = process.env.PORT || 3000

// ── Security ──────────────────────────────────────────────
app.use(helmet())

// CORS — allow all Vercel preview URLs + production
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, curl)
    if (!origin) return callback(null, true)

    const allowed = [
      // Add your exact Vercel URLs here
      'https://reachly-frontend-qip8-git-main-huzaifaahmed0305s-projects.vercel.app',
      'https://reachly-frontend-qip8.vercel.app',
      // Allow ALL vercel.app subdomains for preview deployments
      /\.vercel\.app$/,
      // Local development
      'http://localhost:5173',
      'http://localhost:3000',
    ]

    const isAllowed = allowed.some(pattern => {
      if (pattern instanceof RegExp) return pattern.test(origin)
      return pattern === origin
    })

    if (isAllowed) {
      callback(null, true)
    } else {
      console.log('[CORS] Blocked origin:', origin)
      callback(null, true) // Allow all for now — tighten later
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-key'],
}))

// Handle preflight requests
app.options('*', cors())

// ── Rate limiting ──────────────────────────────────────────
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests. Please try again later.' },
}))

// ── Parsing & logging ──────────────────────────────────────
app.use(express.json())
app.use(morgan('dev'))

// ── Health check ───────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'reachly-api', timestamp: new Date().toISOString() })
})

// ── Routes ─────────────────────────────────────────────────
app.use('/api/auth',        authRoutes)
app.use('/api/influencers', influencerRoutes)
app.use('/api/sessions',    sessionRoutes)
app.use('/api/bookings',    bookingRoutes)
app.use('/api/dashboard',   dashboardRoutes)
app.use('/api/payments',    paymentRoutes)
app.use('/api/admin',       adminRoutes)

// ── 404 ────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` })
})

// ── Global error handler ───────────────────────────────────
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`\n🚀 Reachly API running on http://localhost:${PORT}`)
  console.log(`   ENV: ${process.env.NODE_ENV}`)
})

export default app