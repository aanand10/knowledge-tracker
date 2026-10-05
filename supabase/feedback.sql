-- Feedback from the app. Anyone (signed in or not) can submit; nobody can read
-- through the API: you read it in the Supabase dashboard (Table Editor → feedback).
create table if not exists public.feedback (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id uuid default auth.uid() references auth.users (id) on delete set null,
  kind text not null default 'idea' check (kind in ('idea', 'bug', 'content', 'topic', 'other')),
  message text not null check (char_length(message) between 3 and 2000),
  name text check (char_length(name) <= 80),
  email text check (char_length(email) <= 200),
  page text check (char_length(page) <= 200)
);

alter table public.feedback enable row level security;

drop policy if exists "anyone can send feedback" on public.feedback;
create policy "anyone can send feedback" on public.feedback
  for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());
-- No select/update/delete policies: feedback is write-only from the app.
