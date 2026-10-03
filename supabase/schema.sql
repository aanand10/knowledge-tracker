-- Knowledge Tracker database schema (Supabase / Postgres).
-- Run once in the Supabase SQL editor. Safe to re-run (idempotent where possible).
-- Content (topics + notes) stays in GitHub; this stores per-user data only.

-- ── Profiles: one row per auth user ────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  show_on_leaderboard boolean not null default false,
  created_at timestamptz not null default now()
);

-- Create a profile automatically when someone signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Progress: one row per (user, topic) ────────────────────────────────────
create table if not exists public.user_progress (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  topic_id text not null check (char_length(topic_id) between 1 and 100),
  status text not null default 'not-started' check (status in ('not-started', 'learning', 'confident')),
  confidence smallint not null default 1 check (confidence between 1 and 5),
  last_reviewed date,
  next_review date,
  review_count integer not null default 0 check (review_count >= 0),
  interval_step smallint not null default -1,
  history date[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (user_id, topic_id)
);

-- ── Private quick notes: one row per (user, topic) ─────────────────────────
create table if not exists public.notes (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  topic_id text not null check (char_length(topic_id) between 1 and 100),
  body text not null default '' check (char_length(body) <= 5000),
  updated_at timestamptz not null default now(),
  primary key (user_id, topic_id)
);

-- ── Review log: every "Mark reviewed" click (powers streaks + leaderboard) ─
create table if not exists public.reviews (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  topic_id text not null,
  rating text not null check (rating in ('hard', 'ok', 'easy')),
  reviewed_at timestamptz not null default now()
);
create index if not exists reviews_user_time on public.reviews (user_id, reviewed_at desc);

-- ── Row level security: users only see and change their own rows ───────────
alter table public.profiles enable row level security;
alter table public.user_progress enable row level security;
alter table public.notes enable row level security;
alter table public.reviews enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own progress" on public.user_progress;
create policy "own progress" on public.user_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own notes" on public.notes;
create policy "own notes" on public.notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own reviews read" on public.reviews;
create policy "own reviews read" on public.reviews
  for select using (auth.uid() = user_id);
drop policy if exists "own reviews insert" on public.reviews;
create policy "own reviews insert" on public.reviews
  for insert with check (auth.uid() = user_id and reviewed_at > now() - interval '5 minutes');

-- ── Leaderboard: computed on the server from the review log ────────────────
-- Only users who opted in (profiles.show_on_leaderboard) appear.
-- SECURITY DEFINER lets it aggregate across users while exposing only these columns.
create or replace function public.get_leaderboard(max_rows int default 50)
returns table (
  rank bigint, display_name text, avatar_url text,
  confident bigint, reviews_7d bigint, total_reviews bigint
)
language sql stable security definer set search_path = public as $$
  select
    rank() over (order by coalesce(p_conf.n, 0) desc, coalesce(r.week, 0) desc) as rank,
    pr.display_name, pr.avatar_url,
    coalesce(p_conf.n, 0) as confident,
    coalesce(r.week, 0) as reviews_7d,
    coalesce(r.total, 0) as total_reviews
  from public.profiles pr
  left join (
    select user_id, count(*) n from public.user_progress where status = 'confident' group by user_id
  ) p_conf on p_conf.user_id = pr.id
  left join (
    select user_id, count(*) total,
           count(*) filter (where reviewed_at > now() - interval '7 days') week
    from public.reviews group by user_id
  ) r on r.user_id = pr.id
  where pr.show_on_leaderboard
  order by rank
  limit least(greatest(max_rows, 1), 100);
$$;
revoke all on function public.get_leaderboard(int) from public, anon;
grant execute on function public.get_leaderboard(int) to authenticated;

-- ── Realtime: push changes to the user's other open devices ────────────────
do $$ begin
  alter publication supabase_realtime add table public.user_progress, public.notes;
exception when duplicate_object then null; end $$;
