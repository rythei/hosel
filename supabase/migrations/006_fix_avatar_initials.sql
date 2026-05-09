-- Fix avatar_initials to use first initial of first + last name (e.g. "Tom Murphy" -> "TM")
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  name text;
  parts text[];
  initials text;
begin
  name := coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1));
  parts := string_to_array(trim(name), ' ');
  if array_length(parts, 1) >= 2 then
    initials := upper(left(parts[1], 1) || left(parts[array_length(parts, 1)], 1));
  else
    initials := upper(left(name, 2));
  end if;

  insert into public.users (id, email, display_name, avatar_initials)
  values (new.id, new.email, name, initials);
  return new;
end;
$$;

-- Backfill existing users
update public.users
set avatar_initials = (
  select
    case
      when array_length(string_to_array(trim(display_name), ' '), 1) >= 2
      then upper(
        left(split_part(trim(display_name), ' ', 1), 1) ||
        left(split_part(trim(display_name), ' ', array_length(string_to_array(trim(display_name), ' '), 1)), 1)
      )
      else upper(left(display_name, 2))
    end
);
