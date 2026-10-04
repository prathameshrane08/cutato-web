-- Replica of the live Cutato tables as they existed before supabase/schema.sql
-- (column types and NOT NULL rules from the project's API definition, no data).

create table public.salons (
  id uuid primary key,
  name text not null,
  owner_name text,
  email text not null,
  phone text,
  city text,
  address text,
  active boolean,
  created_at timestamptz,
  updated_at timestamptz
);
create table public.barbers (
  id text primary key,
  name text not null,
  area text not null,
  address text not null,
  dist_km numeric not null,
  rating numeric not null,
  reviews integer not null,
  tagline text,
  about text,
  active boolean not null,
  created_at timestamp not null,
  updated_at timestamp not null,
  image_url text,
  speciality text,
  salon_id uuid,
  email text
);
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text,
  role text not null,
  barber_id text,
  created_at timestamptz,
  salon_id uuid
);
create table public.services (
  id text primary key,
  name text not null,
  category text not null,
  duration_min integer not null,
  base_price_euro integer not null,
  description text,
  active boolean not null,
  created_at timestamp not null,
  updated_at timestamp not null,
  barber_id text,
  salon_id uuid
);
create table public.bookings (
  id text primary key,
  created_at timestamp not null,
  barber_id text not null,
  barber_name text not null,
  service_id text not null,
  service_name text not null,
  duration_min integer not null,
  date text not null,
  time text not null,
  reserved_time jsonb not null,
  demand text not null,
  base_price_euro numeric not null,
  service_price_euro numeric not null,
  tip_euro numeric not null,
  total_euro numeric not null,
  payment_method text not null,
  user_email text not null,
  status text not null,
  assigned_barber_id text,
  user_id uuid,
  reference_image text,
  haircut_brief text,
  ai_style text,
  stripe_paid boolean,
  stripe_session_id text,
  salon_id uuid,
  customer_id uuid,
  payment_status text,
  cancelled_at timestamptz,
  completed_at timestamptz
);
create table public.barber_working_hours (
  id uuid not null,
  barber_id text not null,
  day_of_week integer not null,
  start_time time not null,
  end_time time not null,
  break_start time,
  break_end time,
  active boolean,
  created_at timestamptz,
  updated_at timestamptz
);
create table public.applications (
  id uuid primary key,
  type text not null,
  status text not null,
  name text,
  owner_name text,
  salon_name text,
  email text not null,
  phone text,
  city text,
  address text,
  experience text,
  instagram text,
  created_at timestamptz
);
create table public.barber_avability (
  barber_id text primary key,
  week jsonb not null,
  time_off_date jsonb not null,
  blocked jsonb not null,
  updated_at timestamp not null
);
create table public.salon_settings (
  id integer primary key,
  salon_name text not null,
  address text not null,
  phone text not null,
  email text not null,
  webiste text not null,
  opening_note text not null,
  canellation_policy text not null,
  currency text not null,
  timeyone text not null,
  default_payment_method text not null,
  logo_url text not null,
  cover_page_url text not null,
  updated_at timestamp not null
);
create table public.service_barbers (
  service_id text not null,
  barber_id text not null,
  primary key (service_id, barber_id)
);

-- An old permissive policy of the kind Supabase templates create.
alter table public.profiles enable row level security;
create policy "allow all" on public.profiles for all using (true) with check (true);
alter table public.bookings enable row level security;
create policy "allow all" on public.bookings for all using (true) with check (true);
