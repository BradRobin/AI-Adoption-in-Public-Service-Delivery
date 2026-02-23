-- Create admin_logs table
create table if not exists public.admin_logs (
  id uuid default gen_random_uuid() primary key,
  admin_id uuid references auth.users not null,
  action text not null, -- e.g., 'view_page', 'ban_user', 'activate_user'
  target_id text, -- ID of the row or user being acted upon, or pathname
  details jsonb, -- Arbitrary context (IPs, previous state, etc)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Optimization indexes
create index if not exists admin_logs_admin_id_idx on public.admin_logs(admin_id);
create index if not exists admin_logs_created_at_idx on public.admin_logs(created_at desc);

-- Enable RLS
alter table public.admin_logs enable row level security;

-- Admin read policy
drop policy if exists "Admins can view admin logs" on public.admin_logs;
create policy "Admins can view admin logs"
  on public.admin_logs for select
  using (
    public.is_admin()
  );

-- Backend Insert Policy
-- Only auth'd users can insert logs broadly, but we rely on application logic to supply valid IDs
drop policy if exists "Service or Auth can insert admin logs" on public.admin_logs;
create policy "Service or Auth can insert admin logs"
  on public.admin_logs for insert
  with check (auth.uid() = admin_id);
