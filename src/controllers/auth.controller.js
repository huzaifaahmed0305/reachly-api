import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../utils/supabase.js';
import { signToken } from '../utils/jwt.js';

export const register = async (req, res) => {
  const { email, password, name, role, handle } = req.body;

  const { data: existing } = await supabaseAdmin
    .from('users').select('id').eq('email', email).single();
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const passwordHash = await bcrypt.hash(password, 12);

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .insert({ email, password_hash: passwordHash, name, role })
    .select().single();

  if (error) throw error;

  if (role === 'influencer') {
    const { data: influencer, error: infErr } = await supabaseAdmin
      .from('influencers')
      .insert({
        user_id: user.id,
        name,
        handle: handle || email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '_'),
      })
      .select().single();

    if (infErr) throw infErr;

    await supabaseAdmin
      .from('users').update({ influencer_id: influencer.id }).eq('id', user.id);
  }

  const token = signToken({ userId: user.id, role });
  res.status(201).json({
    message: 'Account created successfully',
    token,
    user: { id: user.id, email, name, role },
  });
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, email, name, role, password_hash, influencer_id')
    .eq('email', email).single();

  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = signToken({ userId: user.id, role: user.role });
  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role, influencer_id: user.influencer_id },
  });
};

export const me = async (req, res) => {
  res.json({ user: req.user });
};
