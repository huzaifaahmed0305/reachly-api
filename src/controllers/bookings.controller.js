import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '../utils/supabase.js';
import { calculateFees } from '../utils/fees.js';

export const createBooking = async (req, res) => {
  const { session_type_id, influencer_id, scheduled_at, payment_method, note } = req.body;

  // Get session type to get price
  const { data: sessionType, error: stErr } = await supabaseAdmin
    .from('session_types')
    .select('*')
    .eq('id', session_type_id)
    .eq('influencer_id', influencer_id)
    .eq('is_active', true)
    .single();

  if (stErr || !sessionType) return res.status(404).json({ error: 'Session type not found' });

  // Check for slot conflict
  const scheduledDate = new Date(scheduled_at);
  const endDate = new Date(scheduledDate.getTime() + sessionType.duration_minutes * 60000);

  const { data: conflict } = await supabaseAdmin
    .from('bookings')
    .select('id')
    .eq('influencer_id', influencer_id)
    .eq('status', 'confirmed')
    .lte('scheduled_at', scheduledDate.toISOString())
    .gte('ends_at', scheduledDate.toISOString())
    .limit(1);

  if (conflict?.length > 0) {
    return res.status(409).json({ error: 'This time slot is already booked' });
  }

  const { grossAmountPKR, platformFee, creatorPayout } = calculateFees(sessionType.price_pkr);
  const bookingRef = `RCH-${uuidv4().slice(0, 8).toUpperCase()}`;

  const { data: booking, error } = await supabaseAdmin
    .from('bookings')
    .insert({
      follower_id: req.user.id,
      influencer_id,
      session_type_id,
      scheduled_at: scheduledDate.toISOString(),
      ends_at: endDate.toISOString(),
      status: 'pending',
      payment_method,
      payment_status: 'pending',
      gross_amount_pkr: grossAmountPKR,
      platform_fee_pkr: platformFee,
      creator_payout_pkr: creatorPayout,
      booking_ref: bookingRef,
      note,
    })
    .select().single();

  if (error) throw error;

  res.status(201).json({
    message: 'Booking created. Complete payment to confirm.',
    booking: {
      ...booking,
      session_type: sessionType,
    },
  });
};

export const getMyBookings = async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const from = (page - 1) * limit;
  const { role, id, influencer_id } = req.user;

  let query = supabaseAdmin
    .from('bookings')
    .select(`
      id, booking_ref, scheduled_at, ends_at, status, payment_status,
      gross_amount_pkr, platform_fee_pkr, creator_payout_pkr,
      payment_method, note, created_at,
      session_types (title, duration_minutes),
      influencers (name, handle, avatar_url)
    `, { count: 'exact' })
    .range(from, from + limit - 1)
    .order('scheduled_at', { ascending: false });

  if (role === 'influencer') {
    query = query.eq('influencer_id', influencer_id);
  } else {
    query = query.eq('follower_id', id);
  }

  if (status) query = query.eq('status', status);

  const { data, error, count } = await query;
  if (error) throw error;

  res.json({ bookings: data, total: count, page: Number(page), limit: Number(limit) });
};

export const getBookingById = async (req, res) => {
  const { id } = req.params;
  const { role, id: userId, influencer_id } = req.user;

  const { data, error } = await supabaseAdmin
    .from('bookings')
    .select(`*, session_types (*), influencers (*)`)
    .eq('id', id)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Booking not found' });

  // Access control
  const isOwner = data.follower_id === userId || data.influencer_id === influencer_id;
  if (!isOwner) return res.status(403).json({ error: 'Access denied' });

  res.json({ booking: data });
};

export const confirmBooking = async (req, res) => {
  const { id } = req.params;

  const { data: influencer } = await supabaseAdmin
    .from('influencers').select('id').eq('user_id', req.user.id).single();

  const { data, error } = await supabaseAdmin
    .from('bookings')
    .update({ status: 'confirmed', updated_at: new Date() })
    .eq('id', id)
    .eq('influencer_id', influencer.id)
    .eq('status', 'pending')
    .select().single();

  if (error || !data) return res.status(404).json({ error: 'Booking not found or already confirmed' });

  res.json({ message: 'Booking confirmed', booking: data });
};

export const cancelBooking = async (req, res) => {
  const { id } = req.params;
  const { id: userId, influencer_id } = req.user;

  const { data: booking } = await supabaseAdmin
    .from('bookings').select('*').eq('id', id).single();

  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  const isOwner = booking.follower_id === userId || booking.influencer_id === influencer_id;
  if (!isOwner) return res.status(403).json({ error: 'Access denied' });

  if (['cancelled', 'completed'].includes(booking.status)) {
    return res.status(400).json({ error: `Booking is already ${booking.status}` });
  }

  const { data, error } = await supabaseAdmin
    .from('bookings')
    .update({ status: 'cancelled', updated_at: new Date() })
    .eq('id', id)
    .select().single();

  if (error) throw error;
  res.json({ message: 'Booking cancelled', booking: data });
};
