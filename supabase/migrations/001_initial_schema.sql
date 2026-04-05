-- ============================================================
-- Reachly — Initial Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- USERS
create table if not exists public.users (
  id              uuid primary key default gen_random_uuid(),
  email           text unique not null,
  password_hash   text not null,
  name            text not null,
  role            text not null check (role in ('influencer', 'follower', 'admin')),
  influencer_id   uuid,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- INFLUENCERS
create table if not exists public.influencers (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references public.users(id) on delete cascade,
  handle          text unique not null,
  name            text not null,
  bio             text,
  avatar_url      text,
  follower_count  integer default 0,
  total_sessions  integer default 0,
  rating          numeric(3,2) default 5.0,
  instagram_url   text,
  youtube_url     text,
  is_active       boolean default true,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- SESSION TYPES
create table if not exists public.session_types (
  id                uuid primary key default gen_random_uuid(),
  influencer_id     uuid references public.influencers(id) on delete cascade,
  title             text not null,
  description       text,
  duration_minutes  integer not null,
  price_pkr         integer not null,
  is_active         boolean default true,
  created_at        timestamptz default now()
);

-- AVAILABILITY SLOTS
create table if not exists public.availability_slots (
  id              uuid primary key default gen_random_uuid(),
  influencer_id   uuid references public.influencers(id) on delete cascade,
  date            date not null,
  start_time      time not null,
  end_time        time not null,
  is_booked       boolean default false,
  created_at      timestamptz default now(),
  unique (influencer_id, date, start_time)
);

-- BOOKINGS
create table if not exists public.bookings (
  id                    uuid primary key default gen_random_uuid(),
  booking_ref           text unique not null,
  follower_id           uuid references public.users(id),
  influencer_id         uuid references public.influencers(id),
  session_type_id       uuid references public.session_types(id),
  scheduled_at          timestamptz not null,
  ends_at               timestamptz not null,
  status                text default 'pending' check (status in ('pending','confirmed','completed','cancelled')),
  payment_method        text check (payment_method in ('jazzcash','easypaisa','card')),
  payment_status        text default 'pending' check (payment_status in ('pending','paid','refunded')),
  gross_amount_pkr      integer not null,
  platform_fee_pkr      integer not null,
  creator_payout_pkr    integer not null,
  note                  text,
  meet_link             text,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_bookings_influencer on public.bookings(influencer_id);
create index if not exists idx_bookings_follower   on public.bookings(follower_id);
create index if not exists idx_bookings_status     on public.bookings(status);
create index if not exists idx_bookings_scheduled  on public.bookings(scheduled_at);
create index if not exists idx_influencers_handle  on public.influencers(handle);
create index if not exists idx_slots_influencer    on public.availability_slots(influencer_id, date);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.users         enable row level security;
alter table public.influencers   enable row level security;
alter table public.session_types enable row level security;
alter table public.bookings      enable row level security;

-- Users: can only see themselves
create policy "users_own" on public.users
  for all using (id = auth.uid());

-- Influencers: public read, own write
create policy "influencers_read" on public.influencers
  for select using (is_active = true);
create policy "influencers_write" on public.influencers
  for all using (user_id = auth.uid());

-- Session types: public read, influencer write
create policy "session_types_read" on public.session_types
  for select using (is_active = true);
create policy "session_types_write" on public.session_types
  for all using (
    influencer_id in (select id from public.influencers where user_id = auth.uid())
  );

-- Bookings: visible to both parties
create policy "bookings_parties" on public.bookings
  for all using (
    follower_id = auth.uid() or
    influencer_id in (select id from public.influencers where user_id = auth.uid())
  );

-- ============================================================
-- AUTO-UPDATE updated_at
-- ============================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger users_updated_at         before update on public.users         for each row execute function public.set_updated_at();
create trigger influencers_updated_at   before update on public.influencers   for each row execute function public.set_updated_at();
create trigger bookings_updated_at      before update on public.bookings      for each row execute function public.set_updated_at();

-- ============================================================
-- SAMPLE DATA (optional — comment out for production)
-- ============================================================
insert into public.influencers (handle, name, bio, follower_count, total_sessions, rating) values
  ('sanaamjad',   'Sana Amjad',   'Lahore-based lifestyle & wellness creator.', 1200000, 340, 4.9),
  ('ahmadraza',   'Ahmad Raza',   'Tech & productivity tips from Karachi.',      540000,  120, 4.8),
  ('zainabk',     'Zainab Khan',  'Fashion & culture from Islamabad.',           890000,  210, 4.7)
on conflict (handle) do nothing;
