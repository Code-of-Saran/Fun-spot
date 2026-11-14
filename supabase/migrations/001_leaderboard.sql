-- Fun Spot leaderboard — run once in the Supabase SQL editor (or `supabase db push`).
-- The browser only ever holds the public anon key, so every rule that matters
-- is enforced HERE, not in the frontend.

create table if not exists public.leaderboard_entries (
  id          uuid primary key default gen_random_uuid(),
  player_name text        not null,
  game_mode   text        not null,
  score       integer     not null,          -- integer: NaN / Infinity / decimals are impossible
  created_at  timestamptz not null default now(),

  constraint player_name_length check (char_length(btrim(player_name)) between 1 and 20),
  constraint player_name_trimmed check (player_name = btrim(player_name)),
  constraint player_name_no_control_chars check (player_name !~ '[[:cntrl:]]'),
  -- Phase 5 will add 'wrong-answers' here.
  constraint game_mode_allowed check (game_mode in ('random')),
  constraint score_range check (score between 0 and 1000)
);

create index if not exists leaderboard_rank_idx
  on public.leaderboard_entries (game_mode, score desc, created_at asc, id asc);

-- Row Level Security: anyone may read and add scores; nobody may edit or delete
-- (no update/delete policies exist, so those operations are denied).
alter table public.leaderboard_entries enable row level security;

drop policy if exists "leaderboard is public" on public.leaderboard_entries;
create policy "leaderboard is public"
  on public.leaderboard_entries for select
  to anon, authenticated
  using (true);

drop policy if exists "players can submit valid scores" on public.leaderboard_entries;
create policy "players can submit valid scores"
  on public.leaderboard_entries for insert
  to anon, authenticated
  with check (
    game_mode = 'random'
    and score between 0 and 1000
    and created_at > now() - interval '1 minute'   -- no back-dated entries
    and created_at < now() + interval '1 minute'
  );

-- Realtime: broadcast new rows to subscribed leaderboards.
do $$
begin
  alter publication supabase_realtime add table public.leaderboard_entries;
exception when duplicate_object then null;
end $$;
