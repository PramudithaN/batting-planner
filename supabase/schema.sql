-- Sri Lanka Cricket: Batting Practice Planner v2.0
-- Free-Tier PostgreSQL + Realtime + Row-Level Security Schema for Supabase

create table if not exists public.coaches (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id),
  name text not null,
  role text not null check (role in ('master', 'coach', 'viewer')),
  pin_hash text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.players (
  id text primary key,
  name text not null,
  squad_tags text[] not null default '{}',
  is_custom boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.practice_days (
  id uuid primary key default gen_random_uuid(),
  practice_date date unique not null,
  available_player_ids text[] not null default '{}',
  created_by uuid references public.coaches(id),
  version integer not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.practice_days(id) on delete cascade,
  name text not null,
  start_time time not null,
  end_time time not null,
  version integer not null default 1
);

create table if not exists public.stations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  station_number integer not null,
  training_type text not null,
  custom_training_type text,
  net_type text not null,
  ball_type text not null,
  bowling_type text not null,
  focus text,
  start_time time not null,
  end_time time not null,
  version integer not null default 1,
  updated_by uuid references public.coaches(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.station_locks (
  station_id uuid not null references public.stations(id) on delete cascade,
  player_id text not null references public.players(id),
  locked_by_coach_id uuid not null references public.coaches(id),
  locked_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '5 minutes'),
  primary key (station_id, player_id)
);

create table if not exists public.ball_events (
  id uuid primary key,
  station_id uuid not null references public.stations(id) on delete cascade,
  player_id text not null references public.players(id),
  coach_id uuid not null references public.coaches(id),
  ball_number integer not null,
  bowling_style text,
  line text,
  length text,
  shot_type text,
  shot_x integer,
  shot_y integer,
  runs text,
  contact_outcome text not null,
  is_undone boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.station_completions (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.stations(id) on delete cascade,
  player_id text not null references public.players(id),
  observing_coach text not null,
  rating integer not null check (rating >= 0 and rating <= 10),
  remarks text,
  completed_by uuid not null references public.coaches(id),
  completed_at timestamptz not null default now(),
  unique (station_id, player_id)
);

-- Enable Row-Level Security
alter table public.coaches enable row level security;
alter table public.players enable row level security;
alter table public.practice_days enable row level security;
alter table public.sessions enable row level security;
alter table public.stations enable row level security;
alter table public.station_locks enable row level security;
alter table public.ball_events enable row level security;
alter table public.station_completions enable row level security;

-- Read access for authenticated users
create policy "Authenticated read practice_days" on public.practice_days
  for select to authenticated using (true);
create policy "Authenticated read sessions" on public.sessions
  for select to authenticated using (true);
create policy "Authenticated read stations" on public.stations
  for select to authenticated using (true);
create policy "Authenticated read station_locks" on public.station_locks
  for select to authenticated using (true);
create policy "Authenticated read ball_events" on public.ball_events
  for select to authenticated using (true);
create policy "Authenticated read station_completions" on public.station_completions
  for select to authenticated using (true);

-- Realtime publication
alter publication supabase_realtime add table public.sessions;
alter publication supabase_realtime add table public.stations;
alter publication supabase_realtime add table public.station_locks;
alter publication supabase_realtime add table public.ball_events;
alter publication supabase_realtime add table public.station_completions;
