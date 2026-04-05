import { supabaseAdmin } from '../utils/supabase.js';

export const getInfluencerDashboard = async (req, res) => {
  const { influencer_id } = req.user;

  if (!influencer_id) return res.status(400).json({ error: 'No influencer profile linked' });

  const now = new Date().toISOString();
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  // Run all queries in parallel
  const [
    { data: upcoming },
    { data: monthlyBookings },
    { data: allTimeStats },
    { data: recentPayouts },
  ] = await Promise.all([
    // Upcoming confirmed bookings
    supabaseAdmin
      .from('bookings')
      .select(`id, booking_ref, scheduled_at, ends_at, gross_amount_pkr, creator_payout_pkr, note,
               session_types (title, duration_minutes),
               users!follower_id (name, email)`)
      .eq('influencer_id', influencer_id)
      .eq('status', 'confirmed')
      .gte('scheduled_at', now)
      .order('scheduled_at')
      .limit(10),

    // This month's bookings
    supabaseAdmin
      .from('bookings')
      .select('id, gross_amount_pkr, creator_payout_pkr, platform_fee_pkr, status')
      .eq('influencer_id', influencer_id)
      .gte('created_at', startOfMonth),

    // All-time stats
    supabaseAdmin
      .from('bookings')
      .select('id, creator_payout_pkr, status')
      .eq('influencer_id', influencer_id)
      .eq('status', 'completed'),

    // Recent payouts
    supabaseAdmin
      .from('bookings')
      .select(`booking_ref, scheduled_at, gross_amount_pkr, platform_fee_pkr, creator_payout_pkr,
               session_types (title),
               users!follower_id (name)`)
      .eq('influencer_id', influencer_id)
      .eq('status', 'completed')
      .order('scheduled_at', { ascending: false })
      .limit(10),
  ]);

  // Compute monthly metrics
  const monthlyConfirmed = (monthlyBookings || []).filter(b => b.status === 'confirmed');
  const monthlyEarnings = monthlyConfirmed.reduce((sum, b) => sum + (b.creator_payout_pkr || 0), 0);
  const monthlyRevenue = monthlyConfirmed.reduce((sum, b) => sum + (b.gross_amount_pkr || 0), 0);
  const platformCut = monthlyConfirmed.reduce((sum, b) => sum + (b.platform_fee_pkr || 0), 0);

  const totalEarnings = (allTimeStats || []).reduce((sum, b) => sum + (b.creator_payout_pkr || 0), 0);

  res.json({
    metrics: {
      upcoming_count: (upcoming || []).length,
      monthly_sessions: monthlyConfirmed.length,
      monthly_gross_pkr: monthlyRevenue,
      monthly_earnings_pkr: monthlyEarnings,
      monthly_platform_fee_pkr: platformCut,
      total_sessions_completed: (allTimeStats || []).length,
      total_earnings_pkr: totalEarnings,
    },
    upcoming_sessions: upcoming || [],
    recent_payouts: recentPayouts || [],
  });
};
