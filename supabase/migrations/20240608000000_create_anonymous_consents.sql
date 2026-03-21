-- Create anonymous consent preferences table for privacy banner
create table if not exists public.anonymous_consents (
  id uuid default gen_random_uuid() primary key,
  anonymous_id uuid not null unique,
  consent_analytics boolean not null default false,
  consent_chat_history boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.anonymous_consents enable row level security;

create index if not exists anonymous_consents_anonymous_id_idx
  on public.anonymous_consents(anonymous_id);
