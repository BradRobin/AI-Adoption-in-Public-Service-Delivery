-- Create profiles table
create table if not exists public.profiles (
  id uuid references auth.users not null primary key,
  email text not null,
  role text not null default 'user',
  is_banned boolean not null default false,
  last_login timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Admin policies
create policy "Admins can view all profiles"
  on public.profiles for select
  using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );

create policy "Admins can update all profiles"
  on public.profiles for update
  using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );

-- User policies
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Trigger to automatically create a profile when a new user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'user');
  return new;
end;
$$;

-- Trigger execution
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Backfill existing users (Optional: run if users already exist)
insert into public.profiles (id, email, role)
select id, email, raw_user_meta_data->>'role' as role
from auth.users
where id not in (select id from public.profiles)
on conflict do nothing;
