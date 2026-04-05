import { supabaseAdmin } from '../utils/supabase.js';

export const getSessionTypes = async (req, res) => {
  const { influencerId } = req.params;

  const { data, error } = await supabaseAdmin
    .from('session_types')
    .select('*')
    .eq('influencer_id', influencerId)
    .eq('is_active', true)
    .order('price_pkr');

  if (error) throw error;
  res.json({ session_types: data });
};

export const createSessionType = async (req, res) => {
  const { title, description, duration_minutes, price_pkr } = req.body;

  const { data: influencer } = await supabaseAdmin
    .from('influencers').select('id').eq('user_id', req.user.id).single();

  if (!influencer) return res.status(404).json({ error: 'Influencer profile not found' });

  const { data, error } = await supabaseAdmin
    .from('session_types')
    .insert({ influencer_id: influencer.id, title, description, duration_minutes, price_pkr })
    .select().single();

  if (error) throw error;
  res.status(201).json({ session_type: data });
};

export const updateSessionType = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const { data: influencer } = await supabaseAdmin
    .from('influencers').select('id').eq('user_id', req.user.id).single();

  const { data, error } = await supabaseAdmin
    .from('session_types')
    .update(updates)
    .eq('id', id)
    .eq('influencer_id', influencer.id)
    .select().single();

  if (error) throw error;
  res.json({ session_type: data });
};

export const deleteSessionType = async (req, res) => {
  const { id } = req.params;

  const { data: influencer } = await supabaseAdmin
    .from('influencers').select('id').eq('user_id', req.user.id).single();

  const { error } = await supabaseAdmin
    .from('session_types')
    .update({ is_active: false })
    .eq('id', id)
    .eq('influencer_id', influencer.id);

  if (error) throw error;
  res.json({ message: 'Session type removed' });
};
