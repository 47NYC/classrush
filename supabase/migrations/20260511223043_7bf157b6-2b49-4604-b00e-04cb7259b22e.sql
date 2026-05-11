-- Fix search_path on remaining functions
create or replace function public.set_updated_at()
returns trigger language plpgsql security definer set search_path = public
as $$ begin new.updated_at := now(); return new; end; $$;

create or replace function public.generate_room_code()
returns text language plpgsql security definer set search_path = public as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
begin
  for i in 1..6 loop
    result := result || substr(chars, 1 + floor(random()*length(chars))::int, 1);
  end loop;
  return result;
end;
$$;

-- Revoke execute on internal-only functions from public/authenticated
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;