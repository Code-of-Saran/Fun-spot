-- Fun Spot leaderboard, Phase 5: adds the Wrong Answers Only!! board.
-- Run after 001_leaderboard.sql (Supabase SQL editor or `supabase db push`).
--
-- One table, two separate boards: rows are told apart by game_mode and each
-- mode has its own score rule, enforced here so the browser can't bypass it.
--   random        → whole number 0–1000
--   wrong_answers → 0–100 with at most one decimal (average of AI-judged rounds)

alter table public.leaderboard_entries
  alter column score type numeric(6, 1);

alter table public.leaderboard_entries drop constraint if exists game_mode_allowed;
alter table public.leaderboard_entries drop constraint if exists score_range;

alter table public.leaderboard_entries
  add constraint game_mode_allowed check (game_mode in ('random', 'wrong_answers')),
  add constraint score_range check (
    (game_mode = 'random' and score between 0 and 1000 and score = trunc(score))
    or (game_mode = 'wrong_answers' and score between 0 and 100)
  );

drop policy if exists "players can submit valid scores" on public.leaderboard_entries;
create policy "players can submit valid scores"
  on public.leaderboard_entries for insert
  to anon, authenticated
  with check (
    game_mode in ('random', 'wrong_answers')
    and created_at > now() - interval '1 minute'   -- no back-dated entries
    and created_at < now() + interval '1 minute'
  );
