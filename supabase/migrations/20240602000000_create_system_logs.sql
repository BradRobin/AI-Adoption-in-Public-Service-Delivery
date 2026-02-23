-- Create system_logs table
create table if not exists public.system_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users null, -- Nullable for anon actions or system events
  action text not null, -- e.g. 'login', 'error', 'query'
  details jsonb, -- arbitrarily complex metadata
  ip_address text, -- anonymized IP string
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Optimization indexes for Admin lookups
create index if not exists system_logs_user_id_idx on public.system_logs(user_id);
create index if not exists system_logs_created_at_idx on public.system_logs(created_at desc);

-- Enable RLS
alter table public.system_logs enable row level security;

-- Admin read policy: only valid admin profiles can view logs
create policy "Admins can view system logs"
  on public.system_logs for select
  using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );

-- Application server insert policy (assumes Service Role Key or edge function insert)
-- We will rely on Service Role key server-side or a broad INSERT policy as long as they can't SELECT
create policy "Anyone can insert logs"
  on public.system_logs for insert
  with check (true);
