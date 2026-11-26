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
-- "Save & finish later" (paid): saved_at lists the session on the dashboard; a saved mock exam's clock stops at paused_at,
-- and the paused time is added to its deadline on resume.
alter table quiz_sessions add column if not exists saved_at timestamptz;
alter table quiz_sessions add column if not exists paused_at timestamptz;
alter table quiz_sessions add column if not exists paused_sec int not null default 0;
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

-- v5: passes are per exam (null = legacy all-exam pass)
alter table entitlements add column if not exists exam text;

-- v6: AI tutor content, generated once and shared (question breakdowns, answer walk-throughs, study-sheet concept cards).
-- source_hash ties each row to the question or topic text it was written from, so admin edits trigger a rewrite.
create table if not exists ai_content (
  key text not null,
  kind text not null,
  source_hash text not null,
  content jsonb not null,
  model text,
  created_at timestamptz not null default now(),
  primary key (key, kind)
);
alter table ai_content enable row level security;

-- v7: cookie-free traffic analytics. visitor = daily-rotating hash (no raw IPs); location comes from Vercel's geo headers.
create table if not exists visits (
  id bigserial primary key,
  visitor text not null,
  started_at timestamptz not null default now(),
  last_at timestamptz not null default now(),
  source text not null,
  medium text not null,
  campaign text,
  content text,
  referrer_host text,
  landing_path text not null,
  country text,
  region text,
  city text,
  device text,
  os text,
  pageviews int not null default 1
);
create index if not exists visits_started_idx on visits (started_at);
create index if not exists visits_visitor_idx on visits (visitor, last_at desc);
create table if not exists page_views (
  id bigserial primary key,
  visit_id bigint not null references visits(id) on delete cascade,
  path text not null,
  created_at timestamptz not null default now()
);
create index if not exists page_views_created_idx on page_views (created_at);
create table if not exists conversions (
  id bigserial primary key,
  visit_id bigint references visits(id) on delete set null,
  visitor text not null,
  kind text not null,
  created_at timestamptz not null default now()
);
create index if not exists conversions_created_idx on conversions (created_at);
alter table visits enable row level security;
alter table page_views enable row level security;
alter table conversions enable row level security;
-- v8: networks the owner browsed from (salted IP hash, never the raw IP). Visits from them aren't counted for 30 days.
create table if not exists stats_owner_networks (
  ip_hash text primary key,
  seen_at timestamptz not null default now()
);
alter table stats_owner_networks enable row level security;

create table if not exists contact_messages (
  id bigserial primary key,
  user_id uuid references users(id) on delete set null,
  name text,
  email text not null,
  topic text not null,
  message text not null,
  page text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);
create index if not exists contact_messages_status_idx on contact_messages (status, created_at desc);
alter table contact_messages enable row level security;

-- Study sheet notebook (pass holders): things a learner saved from the tutor, their own notes, their own topics
-- (study_sections), and per-topic choices: pinned to "Study these next", hidden, or added before practising it.
create table if not exists study_sections (
  id bigserial primary key,
  user_id uuid not null references users(id) on delete cascade,
  exam text not null,
  name text not null,
  created_at timestamptz not null default now()
);
create index if not exists study_sections_owner_idx on study_sections (user_id, exam);
create table if not exists study_items (
  id bigserial primary key,
  user_id uuid not null references users(id) on delete cascade,
  exam text not null,
  kind text not null,
  topic text,
  domain text,
  section_id bigint references study_sections(id) on delete set null,
  title text,
  body text not null,
  source_question text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists study_items_owner_idx on study_items (user_id, exam);
create table if not exists study_topic_prefs (
  user_id uuid not null references users(id) on delete cascade,
  exam text not null,
  topic text not null,
  pinned boolean not null default false,
  hidden boolean not null default false,
  added boolean not null default false,
  primary key (user_id, exam, topic)
);
alter table study_sections enable row level security;
alter table study_items enable row level security;
alter table study_topic_prefs enable row level security;

-- One free trial per person and exam: each trial start records who started it (an account or anonymous visitor),
-- the device (hashed IP + browser) and the network (hashed IP). Never raw IPs.
create table if not exists trial_claims (
  id bigserial primary key,
  exam text not null,
  owner text not null,
  device text not null,
  network text not null,
  created_at timestamptz not null default now(),
  unique (exam, owner)
);
create index if not exists trial_claims_device_idx on trial_claims (exam, device, created_at);
create index if not exists trial_claims_network_idx on trial_claims (exam, network, created_at);
alter table trial_claims enable row level security;

-- The free-trial discount: one per person, for one exam. expires_at is null while passes aren't on sale yet
-- (a launch reservation); once checkout is live it runs 72 hours from the claim.
create table if not exists offers (
  id bigserial primary key,
  user_id uuid not null unique references users(id) on delete cascade,
  exam text not null,
  percent int not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  redeemed_at timestamptz
);
alter table offers enable row level security;

-- Pass expiry reminders: when each reminder email went out, so a pass is reminded at most once per stage.
alter table entitlements add column if not exists reminded_7d_at timestamptz;
alter table entitlements add column if not exists reminded_1d_at timestamptz;
`;
