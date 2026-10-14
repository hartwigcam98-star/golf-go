-- Golf Go daily leaderboard: signed-in players only, one official round per account per day (Oct 2026).
-- Step 1 (applied Oct 14 2026): the account column and the one-a-day rule on it. Harmless on its own.
alter table public.daily_scores add column if not exists user_id uuid references auth.users(id) on delete set null;
create unique index if not exists daily_scores_day_user on public.daily_scores (day, user_id) where user_id is not null;

-- Step 2 (apply once email sign-in codes work and the game's AUTH_REQUIRED is switched on):
-- only a signed-in player can post, only as themselves, only for today (Chicago) or yesterday (a round finished
-- after midnight), with 18 holes of 1-10 strokes that add up to the total.
-- drop policy if exists "anyone can post a score" on public.daily_scores;
-- drop policy if exists "signed-in players post their own round" on public.daily_scores;
-- create policy "signed-in players post their own round" on public.daily_scores for insert to authenticated
--   with check (
--     user_id = auth.uid()
--     and day between (now() at time zone 'America/Chicago')::date - 1 and (now() at time zone 'America/Chicago')::date
--     and jsonb_typeof(holes) = 'array' and jsonb_array_length(holes) = 18
--     and not exists (select 1 from jsonb_array_elements_text(holes) v where v !~ '^[0-9]+$' or v::int not between 1 and 10)
--     and strokes = (select sum(v::int) from jsonb_array_elements_text(holes) v)
--   );
