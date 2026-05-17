create table if not exists public.drive_logs (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  passenger_name text,
  passenger_count integer default 1,
  destination text,
  purpose text,
  start_time time,
  end_time time,
  start_odometer integer default 0,
  end_odometer integer default 0,
  distance integer default 0,
  memo text,
  created_at timestamptz not null default now()
);

create table if not exists public.fuel_logs (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  fuel_amount numeric(10, 3) default 0,
  amount integer default 0,
  odometer integer default 0,
  memo text,
  created_at timestamptz not null default now()
);

alter table public.drive_logs enable row level security;
alter table public.fuel_logs enable row level security;

drop policy if exists "Allow anonymous read drive logs" on public.drive_logs;
drop policy if exists "Allow anonymous write drive logs" on public.drive_logs;
drop policy if exists "Allow anonymous update drive logs" on public.drive_logs;
drop policy if exists "Allow anonymous delete drive logs" on public.drive_logs;
drop policy if exists "Allow anonymous read fuel logs" on public.fuel_logs;
drop policy if exists "Allow anonymous write fuel logs" on public.fuel_logs;
drop policy if exists "Allow anonymous update fuel logs" on public.fuel_logs;
drop policy if exists "Allow anonymous delete fuel logs" on public.fuel_logs;

create policy "Allow anonymous read drive logs"
on public.drive_logs for select
to anon
using (true);

create policy "Allow anonymous write drive logs"
on public.drive_logs for insert
to anon
with check (true);

create policy "Allow anonymous update drive logs"
on public.drive_logs for update
to anon
using (true)
with check (true);

create policy "Allow anonymous delete drive logs"
on public.drive_logs for delete
to anon
using (true);

create policy "Allow anonymous read fuel logs"
on public.fuel_logs for select
to anon
using (true);

create policy "Allow anonymous write fuel logs"
on public.fuel_logs for insert
to anon
with check (true);

create policy "Allow anonymous update fuel logs"
on public.fuel_logs for update
to anon
using (true)
with check (true);

create policy "Allow anonymous delete fuel logs"
on public.fuel_logs for delete
to anon
using (true);

create index if not exists drive_logs_date_start_time_idx
on public.drive_logs (date desc, start_time desc);

create index if not exists fuel_logs_date_idx
on public.fuel_logs (date desc);
