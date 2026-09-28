// Idempotent schema, applied on first connection.
export const SCHEMA = `
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists sessions (
  token_hash text primary key,
  user_id uuid not null references users(id) on delete cascade,
  expires_at timestamptz not null
);

create table if not exists quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  anon_id text,
  exam text not null,
  mode text not null,
  question_ids text[] not null,
  time_limit_sec int,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists quiz_sessions_user_idx on quiz_sessions (user_id, created_at desc);
create index if not exists quiz_sessions_anon_idx on quiz_sessions (anon_id);

create table if not exists attempts (
  id bigserial primary key,
  user_id uuid references users(id) on delete cascade,
  anon_id text,
  session_id uuid not null references quiz_sessions(id) on delete cascade,
  exam text not null,
  question_id text not null,
  picks text[] not null,
  correct boolean not null,
  time_ms int,
  created_at timestamptz not null default now(),
  unique (session_id, question_id)
);
create index if not exists attempts_user_idx on attempts (user_id, exam, created_at);
create index if not exists attempts_anon_idx on attempts (anon_id, exam);

create table if not exists entitlements (
  id bigserial primary key,
  user_id uuid not null references users(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  source text not null,
  external_id text unique,
  amount_cents int,
  created_at timestamptz not null default now()
);
create index if not exists entitlements_user_idx on entitlements (user_id, ends_at desc);

-- v2: Google sign-in, password reset, throttling, trial abuse limits, question moderation
alter table users alter column password_hash drop not null;
alter table users add column if not exists google_sub text unique;
alter table users add column if not exists email_verified boolean not null default false;
alter table users add column if not exists last_login_at timestamptz;

alter table attempts add column if not exists ip_hash text;
create index if not exists attempts_ip_idx on attempts (ip_hash, created_at);

create table if not exists password_resets (
  token_hash text primary key,
  user_id uuid not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists auth_throttle (
  key text not null,
  created_at timestamptz not null default now()
);
create index if not exists auth_throttle_idx on auth_throttle (key, created_at);

create table if not exists question_reports (
  id bigserial primary key,
  question_id text not null,
  user_id uuid references users(id) on delete set null,
  anon_id text,
  reason text not null,
  message text,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists question_reports_status_idx on question_reports (status, created_at desc);

create table if not exists question_overrides (
  question_id text primary key,
  exam text not null,
  data jsonb,
  disabled boolean not null default false,
  updated_by text,
  updated_at timestamptz not null default now()
);

-- Supabase exposes the public schema through its Data API (PostgREST) to the anon/authenticated roles.
-- Row-level security with no policies blocks that path entirely; the app connects as the table owner and is unaffected.
alter table users enable row level security;
alter table sessions enable row level security;
alter table quiz_sessions enable row level security;
alter table attempts enable row level security;
alter table entitlements enable row level security;
alter table password_resets enable row level security;
alter table auth_throttle enable row level security;
alter table question_reports enable row level security;
alter table question_overrides enable row level security;

-- v3: waitlist for when paid passes aren't switched on yet
create table if not exists waitlist (
  email text primary key,
  user_id uuid references users(id) on delete set null,
  source text,
  created_at timestamptz not null default now()
);
alter table waitlist enable row level security;

-- v4: questions a learner flagged as weak (kept_at: last time they chose to keep the flag after the "still weak?" prompt)
create table if not exists flags (
  id bigserial primary key,
  user_id uuid references users(id) on delete cascade,
  anon_id text,
  exam text not null,
  question_id text not null,
  created_at timestamptz not null default now(),
  kept_at timestamptz
);
create unique index if not exists flags_user_q on flags (user_id, question_id) where user_id is not null;
create unique index if not exists flags_anon_q on flags (anon_id, question_id) where user_id is null;
alter table flags enable row level security;
`;
