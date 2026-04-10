/**
 * Admin Route — src/routes/admin.js
 * Add to your backend reachly-api project
 * Then add to src/index.js:
 *   import adminRoutes from './routes/admin.js'
 *   app.use('/api/admin', adminRoutes)
 */
import { Router } from 'express'
import { supabaseAdmin } from '../utils/supabase.js'
import { asyncHandler } from '../middleware/errorHandler.js'

const router = Router()

// Simple admin key check — add ADMIN_SECRET to your Railway env variables
const adminAuth = (req, res, next) => {
  const key = req.headers['x-admin-key']
  if (key !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  next()
}

router.use(adminAuth)

// GET /api/admin/stats — platform overview numbers
router.get('/stats', asyncHandler(async (req, res) => {
  const [
    { count: totalUsers },
    { count: totalInfluencers },
    { count: totalBookings },
    { count: confirmedBookings },
    { data: revenue },
  ] = await Promise.all([
    supabaseAdmin.from('users').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('influencers').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabaseAdmin.from('bookings').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'confirmed'),
    supabaseAdmin.from('bookings').select('gross_amount_pkr, platform_fee_pkr').eq('status', 'confirmed'),
  ])

  const totalRevenue = (revenue || []).reduce((s, b) => s + (b.gross_amount_pkr || 0), 0)
  const platformEarnings = (revenue || []).reduce((s, b) => s + (b.platform_fee_pkr || 0), 0)

  res.json({
    total_users: totalUsers,
    total_influencers: totalInfluencers,
    total_bookings: totalBookings,
    confirmed_bookings: confirmedBookings,
    total_revenue_pkr: totalRevenue,
    platform_earnings_pkr: platformEarnings,
  })
}))

// GET /api/admin/influencers — all influencers
router.get('/influencers', asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('influencers')
    .select(`
      id, handle, name, bio, follower_count, total_sessions, rating, is_active, created_at,
      users!user_id (email)
    `)
    .order('created_at', { ascending: false })

  if (error) throw error
  res.json({ influencers: data })
}))

// GET /api/admin/bookings — all bookings
router.get('/bookings', asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 30 } = req.query
  const from = (page - 1) * limit

  let query = supabaseAdmin
    .from('bookings')
    .select(`
      id, booking_ref, scheduled_at, status, payment_method, payment_status,
      gross_amount_pkr, platform_fee_pkr, creator_payout_pkr, created_at,
      session_types (title, duration_minutes),
      influencers (name, handle),
      users!follower_id (name, email)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1)

  if (status) query = query.eq('status', status)

  const { data, error, count } = await query
  if (error) throw error
  res.json({ bookings: data, total: count })
}))

// GET /api/admin/users — all users
router.get('/users', asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, email, name, role, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) throw error
  res.json({ users: data })
}))

// PATCH /api/admin/influencers/:id/toggle — activate/deactivate
router.patch('/influencers/:id/toggle', asyncHandler(async (req, res) => {
  const { data: inf } = await supabaseAdmin
    .from('influencers').select('is_active').eq('id', req.params.id).single()

  const { data, error } = await supabaseAdmin
    .from('influencers')
    .update({ is_active: !inf.is_active })
    .eq('id', req.params.id)
    .select().single()

  if (error) throw error
  res.json({ influencer: data })
}))

// PATCH /api/admin/bookings/:id/cancel — force cancel any booking
router.patch('/bookings/:id/cancel', asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('bookings')
    .update({ status: 'cancelled', updated_at: new Date() })
    .eq('id', req.params.id)
    .select().single()

  if (error) throw error
  res.json({ booking: data })
}))

export default router
