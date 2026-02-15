-- Create assessments table
create table if not exists assessments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  score integer not null,
  dimension_scores jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table assessments enable row level security;

-- Create policies
create policy "Users can insert their own assessments"
  on assessments for insert
  with check (auth.uid() = user_id);

create policy "Users can view their own assessments"
  on assessments for select
  using (auth.uid() = user_id);
