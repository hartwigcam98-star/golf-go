-- Golf Go smoothness stats (one row per hole played): frame times overall and while the swing meter runs.
-- Insert-only for the game's public key; nobody can read, change or delete rows with it (read through the admin DB job).
create table if not exists public.perf_stats (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  player_id text check (char_length(player_id) <= 40),
  name text check (char_length(name) <= 16),
  ver text check (char_length(ver) <= 40),
  course text check (char_length(course) <= 24),
  hole int,
  mode text check (char_length(mode) <= 16),
  gfx text check (char_length(gfx) <= 8),
  perf int,
  device jsonb,
  frames int,
  fps_avg real, fps_med real, ms_p95 real, ms_max real, stutter_pct real,
  meter_frames int,
  meter_fps_avg real, meter_fps_med real, meter_ms_p95 real, meter_ms_max real, meter_stutter_pct real,
  extra jsonb
);
alter table public.perf_stats enable row level security;
drop policy if exists "perf insert" on public.perf_stats;
create policy "perf insert" on public.perf_stats for insert to anon with check (true);
