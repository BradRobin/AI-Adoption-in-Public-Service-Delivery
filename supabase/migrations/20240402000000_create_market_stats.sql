-- Create market_stats table for storing real-time adoption trends
create table public.market_stats (
    id text primary key,
    label text not null,
    value text not null,
    source text not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.market_stats enable row level security;

-- Create policy to allow read access to everyone
create policy "Enable read access for all users"
on public.market_stats for select
using (true);

-- Create policy to allow insert/update only for authenticated users (or service roles)
-- For this MVP, we'll allow authenticated users to trigger updates via the API
create policy "Enable insert/update for authenticated users"
on public.market_stats for all
using (auth.role() = 'authenticated');

-- Enable Realtime
alter publication supabase_realtime add table public.market_stats;

-- Insert initial mock data
insert into public.market_stats (id, label, value, source)
values 
    ('ai_adoption_rate', 'Kenya AI Adoption', '42.1%', 'Simulated KEPSA Report 2025'),
    ('policy_update', 'Latest Policy', 'Draft AI Bill 2025', 'Kenya Gazette');
