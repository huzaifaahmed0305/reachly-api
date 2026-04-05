/**
 * Seed script — populates Supabase with sample data for testing
 * Run: node supabase/seed.js
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../src/utils/supabase.js';

async function seed() {
  console.log('🌱 Seeding Reachly database...\n');

  // 1. Influencer user
  const hash = await bcrypt.hash('password123', 12);
  const { data: user, error: uErr } = await supabaseAdmin
    .from('users')
    .insert({ email: 'sana@reachly.pk', password_hash: hash, name: 'Sana Amjad', role: 'influencer' })
    .select().single();

  if (uErr) { console.error('User seed failed:', uErr.message); return; }
  console.log('✅ Influencer user:', user.email);

  // 2. Influencer profile
  const { data: inf, error: iErr } = await supabaseAdmin
    .from('influencers')
    .insert({
      user_id: user.id,
      handle: 'sanaamjad',
      name: 'Sana Amjad',
      bio: 'Lahore-based lifestyle creator helping you live a mindful, balanced life.',
      follower_count: 1200000,
      total_sessions: 340,
      rating: 4.9,
    })
    .select().single();

  if (iErr) { console.error('Influencer seed failed:', iErr.message); return; }
  await supabaseAdmin.from('users').update({ influencer_id: inf.id }).eq('id', user.id);
  console.log('✅ Influencer profile:', inf.handle);

  // 3. Session types
  const sessionTypes = [
    { title: 'Quick Chat',       description: 'A short intro call — ask me anything.',              duration_minutes: 20, price_pkr: 2500  },
    { title: '1-on-1 Coaching',  description: 'Deep dive into your personal or content goals.',     duration_minutes: 45, price_pkr: 6000  },
    { title: 'Brand Collab Call',description: 'For brands wanting to explore collaboration.',        duration_minutes: 60, price_pkr: 12000 },
  ];

  for (const s of sessionTypes) {
    await supabaseAdmin.from('session_types').insert({ influencer_id: inf.id, ...s });
  }
  console.log('✅ Created 3 session types');

  // 4. Availability slots (next 7 days)
  const slots = [];
  for (let d = 1; d <= 7; d++) {
    const date = new Date();
    date.setDate(date.getDate() + d);
    const dateStr = date.toISOString().split('T')[0];
    for (const [start, end] of [['10:00','10:20'],['11:30','11:50'],['15:00','15:20'],['17:00','17:20']]) {
      slots.push({ influencer_id: inf.id, date: dateStr, start_time: start, end_time: end });
    }
  }
  await supabaseAdmin.from('availability_slots').insert(slots);
  console.log(`✅ Created ${slots.length} availability slots`);

  // 5. Follower user
  const { data: follower } = await supabaseAdmin
    .from('users')
    .insert({ email: 'ahmed@reachly.pk', password_hash: await bcrypt.hash('password123', 12), name: 'Ahmed Raza', role: 'follower' })
    .select().single();
  console.log('✅ Follower user:', follower.email);

  console.log('\n🎉 Seed complete!');
  console.log('  Influencer: sana@reachly.pk  / password123');
  console.log('  Follower:   ahmed@reachly.pk / password123');
}

seed().catch(console.error);
