/**
 * Availability Controller — src/controllers/availability.controller.js
 */
import { supabaseAdmin } from '../utils/supabase.js'

const DAYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']

// GET /api/availability/me — get influencer's weekly schedule
export const getAvailability = async (req, res) => {
  const { data: influencer } = await supabaseAdmin
    .from('influencers').select('id').eq('user_id', req.user.id).single()

  if (!influencer) return res.status(404).json({ error: 'Influencer profile not found' })

  const { data: schedule } = await supabaseAdmin
    .from('weekly_schedules')
    .select('*')
    .eq('influencer_id', influencer.id)

  const { data: blocked } = await supabaseAdmin
    .from('blocked_dates')
    .select('*')
    .eq('influencer_id', influencer.id)
    .gte('date', new Date().toISOString().split('T')[0])
    .order('date')

  res.json({
    schedule: schedule || [],
    blocked_dates: blocked || [],
  })
}

// POST /api/availability/me/schedule — set weekly recurring schedule
export const setWeeklySchedule = async (req, res) => {
  const { schedule } = req.body
  // schedule: [{ day: 'monday', slots: ['09:00','10:00','14:00'] }]

  const { data: influencer } = await supabaseAdmin
    .from('influencers').select('id').eq('user_id', req.user.id).single()

  if (!influencer) return res.status(404).json({ error: 'Influencer profile not found' })

  // Delete existing schedule
  await supabaseAdmin
    .from('weekly_schedules')
    .delete()
    .eq('influencer_id', influencer.id)

  if (!schedule || schedule.length === 0) {
    return res.json({ message: 'Schedule cleared', schedule: [] })
  }

  // Insert new schedule
  const rows = []
  for (const day of schedule) {
    for (const time of day.slots) {
      rows.push({
        influencer_id: influencer.id,
        day_of_week: day.day,
        start_time: time,
      })
    }
  }

  const { data, error } = await supabaseAdmin
    .from('weekly_schedules')
    .insert(rows)
    .select()

  if (error) throw error

  console.log(`[AVAILABILITY] ${influencer.id} set ${rows.length} weekly slots`)
  res.json({ message: 'Schedule saved!', schedule: data })
}

// GET /api/availability/:influencerId/slots?date=YYYY-MM-DD
export const getBookableSlots = async (req, res) => {
  const { influencerId } = req.params
  const { date } = req.query

  if (!date) return res.status(400).json({ error: 'date query param required (YYYY-MM-DD)' })

  const dayOfWeek = DAYS[new Date(date).getDay()]

  // Get weekly schedule for this day
  const { data: schedule } = await supabaseAdmin
    .from('weekly_schedules')
    .select('start_time')
    .eq('influencer_id', influencerId)
    .eq('day_of_week', dayOfWeek)

  if (!schedule || schedule.length === 0) {
    return res.json({ slots: [], date, day: dayOfWeek })
  }

  // Check if date is blocked
  const { data: blocked } = await supabaseAdmin
    .from('blocked_dates')
    .select('id')
    .eq('influencer_id', influencerId)
    .eq('date', date)
    .single()

  if (blocked) {
    return res.json({ slots: [], date, day: dayOfWeek, blocked: true })
  }

  // Get already booked slots for this date
  const startOfDay = new Date(date + 'T00:00:00+05:00').toISOString()
  const endOfDay   = new Date(date + 'T23:59:59+05:00').toISOString()

  const { data: booked } = await supabaseAdmin
    .from('bookings')
    .select('scheduled_at')
    .eq('influencer_id', influencerId)
    .in('status', ['pending', 'confirmed'])
    .gte('scheduled_at', startOfDay)
    .lte('scheduled_at', endOfDay)

  const bookedTimes = (booked || []).map(b =>
    new Date(b.scheduled_at).toLocaleTimeString('en-PK', {
      hour:'2-digit', minute:'2-digit', hour12:false,
      timeZone:'Asia/Karachi'
    })
  )

  const available = schedule
    .map(s => s.start_time.slice(0, 5))
    .filter(t => !bookedTimes.includes(t))
    .sort()

  res.json({ slots: available, date, day: dayOfWeek })
}

// POST /api/availability/me/block — block a specific date
export const blockDate = async (req, res) => {
  const { date, reason } = req.body

  const { data: influencer } = await supabaseAdmin
    .from('influencers').select('id').eq('user_id', req.user.id).single()

  const { data, error } = await supabaseAdmin
    .from('blocked_dates')
    .upsert({ influencer_id: influencer.id, date, reason: reason || 'Unavailable' })
    .select().single()

  if (error) throw error
  res.json({ message: 'Date blocked', blocked: data })
}

// DELETE /api/availability/me/block/:date — unblock a date
export const unblockDate = async (req, res) => {
  const { date } = req.params

  const { data: influencer } = await supabaseAdmin
    .from('influencers').select('id').eq('user_id', req.user.id).single()

  await supabaseAdmin
    .from('blocked_dates')
    .delete()
    .eq('influencer_id', influencer.id)
    .eq('date', date)

  res.json({ message: 'Date unblocked' })
}
