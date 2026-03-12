create table if not exists sessions (
  id text primary key,
  name text not null,
  starts_at timestamptz not null,
  is_current boolean not null default false
);

create table if not exists drivers (
  id text not null,
  session_id text not null references sessions(id) on delete cascade,
  full_name text not null,
  number int not null,
  team_name text not null,
  deep_link text not null,
  primary key (id, session_id)
);

create table if not exists telemetry_ticks (
  id bigserial primary key,
  session_id text not null references sessions(id) on delete cascade,
  driver_id text not null,
  x double precision not null,
  y double precision not null,
  z double precision not null,
  speed_kph double precision not null,
  lap int not null,
  rank int not null,
  timestamp_ms bigint not null
);

create index if not exists idx_telemetry_driver_time
  on telemetry_ticks(driver_id, timestamp_ms desc);

create table if not exists race_flags (
  id bigserial primary key,
  session_id text not null references sessions(id) on delete cascade,
  flag_type text not null,
  sector text,
  timestamp_ms bigint not null
);

create table if not exists ai_predictions (
  id bigserial primary key,
  session_id text not null references sessions(id) on delete cascade,
  lap int not null,
  trigger_driver_id text not null,
  podium_prob jsonb not null,
  reasoning_summary text not null,
  model_latency_ms int not null,
  timestamp_ms bigint not null
);

create table if not exists app_users (
  id text primary key,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists oauth_identities (
  provider text not null,
  provider_user_id text not null,
  user_id text not null references app_users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (provider, provider_user_id)
);

create unique index if not exists idx_oauth_identity_user_provider
  on oauth_identities(user_id, provider);
