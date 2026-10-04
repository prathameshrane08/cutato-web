-- Cutato database schema for Supabase (Postgres).
--
-- Run this whole file once in the Supabase dashboard: SQL Editor -> New query -> Run.
-- It is idempotent, so running it again on an existing project is safe.
--
-- Security model:
--   * The browser uses the public anon key, so every table has row-level security (RLS).
--   * Server API routes use the service-role key, which bypasses RLS; those routes
--     authorize callers themselves (app/lib/supabase/serverAuth.ts).
--   * IDs are text so legacy IDs and generated UUIDs both fit.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.salons (
  id          text primary key default gen_random_uuid()::text,
  name        text not null,
  owner_name  text,
  email       text,
  phone       text,
  city        text,
  address     text,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.barbers (
  id          text primary key default gen_random_uuid()::text,
  salon_id    text references public.salons (id) on delete set null,
  name        text not null,
  email       text,
  area        text,
  address     text,
  dist_km     numeric not null default 0,
  rating      numeric not null default 5,
  reviews     integer not null default 0,
  tagline     text,
  about       text,
  speciality  text,
  image_url   text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists barbers_salon_id_idx on public.barbers (salon_id);

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  name        text,
  role        text not null default 'customer' check (role in ('customer', 'barber', 'salon')),
  barber_id   text references public.barbers (id) on delete set null,
  salon_id    text references public.salons (id) on delete set null,
  created_at  timestamptz not null default now()
);

-- One row per (service, barber); the app stores ids as "<serviceId>_<barberId>".
create table if not exists public.services (
  id               text primary key,
  barber_id        text not null references public.barbers (id) on delete cascade,
  name             text not null,
  category         text not null default 'Other',
  duration_min     integer not null default 30 check (duration_min between 5 and 240),
  base_price_euro  numeric not null default 0 check (base_price_euro >= 0),
  description      text,
  active           boolean not null default true,
  created_at       timestamptz not null default now()
);
create index if not exists services_barber_id_idx on public.services (barber_id);

create table if not exists public.bookings (
  id                  text primary key,
  created_at          timestamptz not null default now(),
  user_id             uuid references auth.users (id) on delete set null,
  customer_id         text,
  salon_id            text references public.salons (id) on delete set null,
  barber_id           text not null,
  barber_name         text,
  assigned_barber_id  text,
  service_id          text,
  service_name        text,
  duration_min        integer not null default 30,
  date                text not null,
  time                text not null,
  reserved_time       text[] not null default '{}',
  demand              text default 'normal',
  base_price_euro     numeric not null default 0,
  service_price_euro  numeric not null default 0,
  tip_euro            numeric not null default 0,
  total_euro          numeric not null default 0,
  payment_method      text not null default 'salon',
  payment_status      text default 'unpaid',
  user_email          text,
  status              text not null default 'pending'
                        check (status in ('pending', 'confirmed', 'completed', 'cancelled')),
  reference_image     text,
  haircut_brief       text,
  ai_style            text,
  stripe_paid         boolean not null default false,
  stripe_session_id   text,
  cancelled_at        timestamptz,
  completed_at        timestamptz
);
create index if not exists bookings_barber_date_idx on public.bookings (barber_id, date);
create index if not exists bookings_user_id_idx on public.bookings (user_id);
create index if not exists bookings_salon_id_idx on public.bookings (salon_id);

create table if not exists public.barber_working_hours (
  barber_id    text not null references public.barbers (id) on delete cascade,
  day_of_week  integer not null check (day_of_week between 0 and 6),
  start_time   text not null default '09:00',
  end_time     text not null default '18:00',
  break_start  text,
  break_end    text,
  active       boolean not null default true,
  updated_at   timestamptz not null default now(),
  primary key (barber_id, day_of_week)
);

-- Partner applications. Written and read only by server routes (service role).
create table if not exists public.applications (
  id          text primary key default gen_random_uuid()::text,
  type        text not null check (type in ('barber', 'salon')),
  status      text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  name        text,
  salon_name  text,
  owner_name  text,
  email       text not null,
  phone       text,
  city        text,
  address     text,
  experience  text,
  instagram   text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Helpers (security definer so policies can read profiles without recursion)
-- ---------------------------------------------------------------------------

create or replace function public.current_salon_id() returns text
language sql stable security definer set search_path = public as $$
  select salon_id from public.profiles where id = auth.uid() and role = 'salon'
$$;

create or replace function public.current_barber_id() returns text
language sql stable security definer set search_path = public as $$
  select barber_id from public.profiles where id = auth.uid() and role = 'barber'
$$;

-- Create a customer profile for every new auth user.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name, role)
  values (new.id, new.email, split_part(coalesce(new.email, ''), '@', 1), 'customer')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Payment fields may only be changed by the server (Stripe webhook / checkout) or in the dashboard.
create or replace function public.protect_booking_payment_fields() returns trigger
language plpgsql as $$
begin
  -- Only end users are restricted; the server and dashboard keep full control.
  if current_user in ('anon', 'authenticated') then
    new.stripe_paid := old.stripe_paid;
    new.stripe_session_id := old.stripe_session_id;
    new.service_price_euro := old.service_price_euro;
    new.total_euro := old.total_euro;
    new.user_id := old.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_protect_payment on public.bookings;
create trigger bookings_protect_payment
  before update on public.bookings
  for each row execute function public.protect_booking_payment_fields();

-- Roles and portal links may only be changed by the server (admin approval) or in the dashboard.
create or replace function public.protect_profile_role() returns trigger
language plpgsql as $$
begin
  -- Only end users are restricted; the server and dashboard keep full control.
  if current_user in ('anon', 'authenticated') then
    new.role := old.role;
    new.salon_id := old.salon_id;
    new.barber_id := old.barber_id;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

-- Booked time slots without any customer data, readable by everyone so the
-- booking page can show availability. Runs with owner rights (bypasses RLS).
create or replace view public.booking_slots as
  select barber_id, assigned_barber_id, date, time, reserved_time, duration_min, status
  from public.bookings
  where status in ('pending', 'confirmed');

grant select on public.booking_slots to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.salons enable row level security;
alter table public.barbers enable row level security;
alter table public.profiles enable row level security;
alter table public.services enable row level security;
alter table public.bookings enable row level security;
alter table public.barber_working_hours enable row level security;
alter table public.applications enable row level security;

-- Salons: public directory; owners edit their own salon.
drop policy if exists "salons are public" on public.salons;
create policy "salons are public" on public.salons for select using (true);

drop policy if exists "owners update their salon" on public.salons;
create policy "owners update their salon" on public.salons for update
  using (id = public.current_salon_id()) with check (id = public.current_salon_id());

-- Barbers: public directory; salon owners manage their team; barbers edit themselves.
drop policy if exists "barbers are public" on public.barbers;
create policy "barbers are public" on public.barbers for select using (true);

drop policy if exists "salon owners add barbers" on public.barbers;
create policy "salon owners add barbers" on public.barbers for insert
  with check (salon_id is not null and salon_id = public.current_salon_id());

drop policy if exists "salon owners or barber update barber" on public.barbers;
create policy "salon owners or barber update barber" on public.barbers for update
  using (salon_id = public.current_salon_id() or id = public.current_barber_id())
  with check (salon_id = public.current_salon_id() or id = public.current_barber_id());

drop policy if exists "salon owners remove barbers" on public.barbers;
create policy "salon owners remove barbers" on public.barbers for delete
  using (salon_id = public.current_salon_id());

-- Profiles: users see their own; salon owners see their team. Users can only
-- create or keep a plain customer profile; roles are granted by the server.
drop policy if exists "read own or team profiles" on public.profiles;
create policy "read own or team profiles" on public.profiles for select
  using (id = auth.uid() or (salon_id is not null and salon_id = public.current_salon_id()));

drop policy if exists "create own customer profile" on public.profiles;
create policy "create own customer profile" on public.profiles for insert
  with check (id = auth.uid() and role = 'customer' and salon_id is null and barber_id is null);

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- Services: public catalogue; managed by the barber or their salon owner.
drop policy if exists "services are public" on public.services;
create policy "services are public" on public.services for select using (true);

drop policy if exists "barber or salon manages services" on public.services;
create policy "barber or salon manages services" on public.services for all
  using (
    barber_id = public.current_barber_id()
    or barber_id in (select b.id from public.barbers b where b.salon_id = public.current_salon_id())
  )
  with check (
    barber_id = public.current_barber_id()
    or barber_id in (select b.id from public.barbers b where b.salon_id = public.current_salon_id())
  );

-- Bookings: customers create and see their own; barbers and salons see theirs.
drop policy if exists "customers create own bookings" on public.bookings;
create policy "customers create own bookings" on public.bookings for insert to authenticated
  with check (user_id = auth.uid() and stripe_paid = false and status = 'pending');

drop policy if exists "parties read bookings" on public.bookings;
create policy "parties read bookings" on public.bookings for select
  using (
    user_id = auth.uid()
    or barber_id = public.current_barber_id()
    or assigned_barber_id = public.current_barber_id()
    or salon_id = public.current_salon_id()
  );

drop policy if exists "parties update bookings" on public.bookings;
create policy "parties update bookings" on public.bookings for update
  using (
    user_id = auth.uid()
    or barber_id = public.current_barber_id()
    or assigned_barber_id = public.current_barber_id()
    or salon_id = public.current_salon_id()
  );

-- Working hours: public (needed to compute free slots); writes go through the server.
drop policy if exists "working hours are public" on public.barber_working_hours;
create policy "working hours are public" on public.barber_working_hours for select using (true);

-- Applications: no client policies, so only the service role can access them.
