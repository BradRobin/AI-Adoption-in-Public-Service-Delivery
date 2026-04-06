alter table public.profiles
add column if not exists gender text not null default 'rather_not_say';

alter table public.profiles
drop constraint if exists profiles_gender_check;

alter table public.profiles
add constraint profiles_gender_check
check (gender in ('male', 'female', 'rather_not_say'));
