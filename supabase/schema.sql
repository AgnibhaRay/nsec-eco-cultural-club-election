-- Eco Cultural Club President Election
-- Run this entire file once in the Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists public.candidates (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 100),
  ballot_number smallint not null unique check (ballot_number between 1 and 3),
  tagline text not null default '',
  accent text not null default '#174c36' check (accent ~ '^#[0-9A-Fa-f]{6}$'),
  photo_path text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.election_settings (
  id smallint primary key default 1 check (id = 1),
  is_open boolean not null default true,
  results_published boolean not null default false,
  results_published_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  voter_name text not null check (char_length(voter_name) between 2 and 100),
  voter_name_key text not null unique,
  candidate_id uuid not null references public.candidates(id) on delete restrict,
  photo_path text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  admin_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists votes_candidate_id_idx on public.votes(candidate_id);
create index if not exists votes_created_at_idx on public.votes(created_at desc);
create index if not exists audit_logs_created_at_idx on public.audit_logs(created_at desc);

alter table public.candidates enable row level security;
alter table public.election_settings enable row level security;
alter table public.votes enable row level security;
alter table public.admin_users enable row level security;
alter table public.audit_logs enable row level security;

-- No public RLS policies are created. All reads and writes pass through guarded
-- Next.js server routes using the service-role key. Never expose that key publicly.

insert into public.election_settings (id, is_open)
values (1, false)
on conflict (id) do nothing;

insert into public.candidates (name, ballot_number, tagline, accent)
values
  ('Candidate One', 1, 'Add the candidate manifesto line', '#D05D3D'),
  ('Candidate Two', 2, 'Add the candidate manifesto line', '#28765B'),
  ('Candidate Three', 3, 'Add the candidate manifesto line', '#345D9D')
on conflict (ballot_number) do update set
  name = excluded.name,
  tagline = excluded.tagline,
  accent = excluded.accent,
  active = true;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'voter-selfies',
  'voter-selfies',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'candidate-photos',
  'candidate-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Keep ballot records immutable through ordinary database roles. The service-role
-- app only inserts votes and deliberately exposes no update/delete ballot endpoint.
revoke update, delete on public.votes from anon, authenticated;
revoke all on public.admin_users from anon, authenticated;
revoke all on public.audit_logs from anon, authenticated;

-- After creating an admin in Authentication > Users, authorize it with:
-- insert into public.admin_users (user_id)
-- select id from auth.users where email = 'admin@example.com';

-- Replace the candidate placeholders before opening voting, for example:
-- update public.candidates
-- set name = 'Full Name', tagline = 'Short manifesto line'
-- where ballot_number = 1;
