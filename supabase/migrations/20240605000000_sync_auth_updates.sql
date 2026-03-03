-- Create a trigger function to sync email updates from auth.users to public.profiles
create or replace function public.sync_auth_email_to_profiles()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles
    set email = new.email
    where id = new.id;
  end if;
  return new;
end;
$$;

-- Create the trigger
drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update on auth.users
  for each row execute procedure public.sync_auth_email_to_profiles();
