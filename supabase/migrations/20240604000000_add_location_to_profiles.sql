-- Add location column to public.profiles table
alter table public.profiles
add column if not exists location text;
