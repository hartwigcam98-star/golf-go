-- Golf Go "Ask": a log of in-game questions and Claude's answers (also used for the daily and per-player limits).
-- Only the server function (service role) can read or write it; the game itself has no access.
create table if not exists public.ask_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  pid text,
  iph text,
  q text not null,
  a text,
  err text,
  ver text,
  in_tok int,
  out_tok int,
  cache_read int,
  cache_write int
);
create index if not exists ask_log_created on public.ask_log (created_at);
create index if not exists ask_log_pid on public.ask_log (pid, created_at);
alter table public.ask_log enable row level security;
-- no policies: anon and authenticated users can't touch it; the Edge Function uses the service role.
