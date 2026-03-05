-- Create the conversations table to store chat histories
create table if not exists public.conversations (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users not null,
    title text not null default 'New Chat',
    messages jsonb not null default '[]'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.conversations enable row level security;

-- Policies
create policy "Users can insert their own conversations"
    on public.conversations for insert
    with check (auth.uid() = user_id);

create policy "Users can view their own conversations"
    on public.conversations for select
    using (auth.uid() = user_id);

create policy "Users can update their own conversations"
    on public.conversations for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "Users can delete their own conversations"
    on public.conversations for delete
    using (auth.uid() = user_id);

-- Optional: Create an index for faster lookups by user_id
create index if not exists conversations_user_id_idx on public.conversations(user_id);
