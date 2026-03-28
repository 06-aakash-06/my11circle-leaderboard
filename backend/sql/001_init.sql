-- Seasons
create table if not exists seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  end_date date,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Players
create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  name text not null,
  created_at timestamptz default now(),
  unique(season_id, name)
);

-- Matches
create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  name text not null,
  match_date date not null,
  contest_url text,
  multiplier numeric not null default 1.0 check (multiplier in (1, 2, 3)),
  is_complete boolean not null default false,
  created_at timestamptz default now()
);

-- Scores
create table if not exists scores (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  raw_points numeric not null default 0,
  multiplied_points numeric not null default 0,
  source text not null check (source in ('scraped', 'manual', 'absent')),
  created_at timestamptz default now(),
  unique(match_id, player_id)
);

create index if not exists idx_players_season_id on players(season_id);
create index if not exists idx_matches_season_id_match_date on matches(season_id, match_date);
create index if not exists idx_scores_match_id on scores(match_id);
create index if not exists idx_scores_player_id on scores(player_id);

-- Keep multiplied_points synchronized with match multiplier.
create or replace function recalc_score_multiplier_for_score()
returns trigger as $$
begin
  new.multiplied_points := coalesce(new.raw_points, 0) * (
    select m.multiplier from matches m where m.id = new.match_id
  );
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_scores_recalc_before_write on scores;
create trigger trg_scores_recalc_before_write
before insert or update of raw_points, match_id
on scores
for each row
execute function recalc_score_multiplier_for_score();

create or replace function recalc_score_multiplier_for_match_update()
returns trigger as $$
begin
  if old.multiplier is distinct from new.multiplier then
    update scores s
      set multiplied_points = s.raw_points * new.multiplier
      where s.match_id = new.id;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_matches_recalc_scores_after_multiplier_update on matches;
create trigger trg_matches_recalc_scores_after_multiplier_update
after update of multiplier
on matches
for each row
execute function recalc_score_multiplier_for_match_update();

-- Public-facing views
create or replace view season_leaderboard as
select
  p.id,
  p.name,
  p.season_id,
  coalesce(sum(case when m.is_complete then s.multiplied_points else 0 end), 0) as total_points,
  count(case when m.is_complete then s.id end) as matches_played
from players p
left join scores s on s.player_id = p.id
left join matches m on m.id = s.match_id
group by p.id, p.name, p.season_id
order by total_points desc;

create or replace view match_scorecard as
select
  p.name,
  s.raw_points,
  s.multiplied_points,
  s.source,
  m.multiplier,
  m.id as match_id
from scores s
join players p on p.id = s.player_id
join matches m on m.id = s.match_id;
