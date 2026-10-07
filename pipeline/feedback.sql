-- Golf Go feedback (run once in the Supabase SQL editor of the same project as daily_scores)
create table if not exists public.feedback (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  player_id text,
  name text check (char_length(name) <= 16),
  kind text check (kind in ('bug','idea','course','other')),
  message text not null check (char_length(message) between 1 and 2000),
  ctx jsonb,
  shot text check (shot is null or char_length(shot) < 600000)
);
alter table public.feedback enable row level security;
drop policy if exists "feedback insert" on public.feedback;
create policy "feedback insert" on public.feedback for insert to anon with check (true);
-- lets the GitHub job read it with the game's public key (no update or delete for anyone)
drop policy if exists "feedback read" on public.feedback;
create policy "feedback read" on public.feedback for select to anon using (true);
