-- Doctor schedules and patient registrations
-- Run in Supabase SQL Editor

begin;

create table if not exists public.doctor_schedules (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  schedule_date date not null,
  start_time time not null,
  end_time time not null,
  capacity integer not null default 10,
  note text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint doctor_schedules_capacity_positive check (capacity > 0),
  constraint doctor_schedules_time_valid check (end_time > start_time)
);

create table if not exists public.schedule_registrations (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.doctor_schedules(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (schedule_id, patient_id)
);

create index if not exists idx_doctor_schedules_doctor_date on public.doctor_schedules(doctor_id, schedule_date, start_time);
create index if not exists idx_schedule_registrations_schedule on public.schedule_registrations(schedule_id);
create index if not exists idx_schedule_registrations_patient on public.schedule_registrations(patient_id);

create or replace function public.set_doctor_schedules_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_doctor_schedules_updated_at on public.doctor_schedules;
create trigger trg_doctor_schedules_updated_at
before update on public.doctor_schedules
for each row
execute function public.set_doctor_schedules_updated_at();

alter table public.doctor_schedules enable row level security;
alter table public.schedule_registrations enable row level security;

-- doctor schedules policies

drop policy if exists doctor_schedules_select_doctor_or_patient on public.doctor_schedules;
create policy doctor_schedules_select_doctor_or_patient
on public.doctor_schedules
for select
to authenticated
using (
  doctor_id = auth.uid()
  or exists (
    select 1 from public.patients p
    where p.id = auth.uid() and p.doctor_id = doctor_schedules.doctor_id
  )
);

drop policy if exists doctor_schedules_insert_self on public.doctor_schedules;
create policy doctor_schedules_insert_self
on public.doctor_schedules
for insert
to authenticated
with check (doctor_id = auth.uid());

drop policy if exists doctor_schedules_update_self on public.doctor_schedules;
create policy doctor_schedules_update_self
on public.doctor_schedules
for update
to authenticated
using (doctor_id = auth.uid())
with check (doctor_id = auth.uid());

drop policy if exists doctor_schedules_delete_self on public.doctor_schedules;
create policy doctor_schedules_delete_self
on public.doctor_schedules
for delete
to authenticated
using (doctor_id = auth.uid());

-- schedule registrations policies

drop policy if exists schedule_registrations_select_participants on public.schedule_registrations;
create policy schedule_registrations_select_participants
on public.schedule_registrations
for select
to authenticated
using (
  patient_id = auth.uid()
  or exists (
    select 1
    from public.doctor_schedules ds
    where ds.id = schedule_registrations.schedule_id
      and ds.doctor_id = auth.uid()
  )
);

drop policy if exists schedule_registrations_insert_patient_self on public.schedule_registrations;
create policy schedule_registrations_insert_patient_self
on public.schedule_registrations
for insert
to authenticated
with check (
  patient_id = auth.uid()
  and exists (
    select 1
    from public.doctor_schedules ds
    join public.patients p on p.id = auth.uid()
    where ds.id = schedule_id
      and p.doctor_id = ds.doctor_id
  )
);

drop policy if exists schedule_registrations_delete_patient_self on public.schedule_registrations;
create policy schedule_registrations_delete_patient_self
on public.schedule_registrations
for delete
to authenticated
using (patient_id = auth.uid());

commit;
