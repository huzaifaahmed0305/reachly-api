import { supabaseAdmin } from '../utils/supabase.js';

export const listInfluencers = async (req, res) => {
  const { search, page = 1, limit = 20 } = req.query;
  const from = (page - 1) * limit;

  let query = supabaseAdmin
    .from('influencers')
    .select('id, handle, name, bio, avatar_url, follower_count, total_sessions, rating', { count: 'exact' })
    .eq('is_active', true)
    .range(from, from + limit - 1);

  if (search) query = query.ilike('name', `%${search}%`);

  const { data, error, count } = await query;
  if (error) throw error;

  res.json({ influencers: data, total: count, page: Number(page), limit: Number(limit) });
};

export const getInfluencer = async (req, res) => {
  const { handle } = req.params;

  const { data: influencer, error } = await supabaseAdmin
    .from('influencers')
    .select(`
      id, handle, name, bio, avatar_url, follower_count, total_sessions, rating, instagram_url, youtube_url,
      session_types (id, title, description, duration_minutes, price_pkr, is_active)
    `)
    .eq('handle', handle)
    .eq('is_active', true)
    .single();

  if (error || !influencer) return res.status(404).json({ error: 'Influencer not found' });

  res.json({ influencer });
};

export const updateProfile = async (req, res) => {
  const { bio, handle, avatar_url, instagram_url, youtube_url } = req.body;

  const { data, error } = await supabaseAdmin
    .from('influencers')
    .update({ bio, handle, avatar_url, instagram_url, youtube_url, updated_at: new Date() })
    .eq('user_id', req.user.id)
    .select().single();

  if (error) throw error;
  res.json({ influencer: data });
};

export const getAvailability = async (req, res) => {
  const { handle } = req.params;
  const { date } = req.query; // YYYY-MM-DD

  const { data: influencer } = await supabaseAdmin
    .from('influencers').select('id').eq('handle', handle).single();

  if (!influencer) return res.status(404).json({ error: 'Influencer not found' });

  const { data: slots } = await supabaseAdmin
    .from('availability_slots')
    .select('*')
    .eq('influencer_id', influencer.id)
    .eq('date', date)
    .eq('is_booked', false);

  res.json({ slots: slots || [] });
};

export const setAvailability = async (req, res) => {
  const { slots } = req.body;
  // slots: [{ date: 'YYYY-MM-DD', start_time: 'HH:MM', end_time: 'HH:MM' }]

  const { data: influencer } = await supabaseAdmin
    .from('influencers').select('id').eq('user_id', req.user.id).single();

  const rows = slots.map(s => ({ ...s, influencer_id: influencer.id }));

  const { data, error } = await supabaseAdmin
    .from('availability_slots').upsert(rows).select();

  if (error) throw error;
  res.json({ slots: data });
};
