-- Assessment Drafts table for doctor-side saved assessments
-- Run in Supabase SQL Editor

begin;

create extension if not exists pgcrypto;

create table if not exists public.assessment_drafts (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  template_id text not null,
  title text not null,
  form_data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_assessment_drafts_doctor_id on public.assessment_drafts(doctor_id);
create index if not exists idx_assessment_drafts_updated_at on public.assessment_drafts(updated_at desc);

create or replace function public.set_assessment_drafts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_assessment_drafts_updated_at on public.assessment_drafts;
create trigger trg_assessment_drafts_updated_at
before update on public.assessment_drafts
for each row
execute function public.set_assessment_drafts_updated_at();

alter table public.assessment_drafts enable row level security;

drop policy if exists assessment_drafts_select_self on public.assessment_drafts;
create policy assessment_drafts_select_self
on public.assessment_drafts
for select
to authenticated
using (doctor_id = auth.uid());

drop policy if exists assessment_drafts_insert_self on public.assessment_drafts;
create policy assessment_drafts_insert_self
on public.assessment_drafts
for insert
to authenticated
with check (doctor_id = auth.uid());

drop policy if exists assessment_drafts_update_self on public.assessment_drafts;
create policy assessment_drafts_update_self
on public.assessment_drafts
for update
to authenticated
using (doctor_id = auth.uid())
with check (doctor_id = auth.uid());

drop policy if exists assessment_drafts_delete_self on public.assessment_drafts;
create policy assessment_drafts_delete_self
on public.assessment_drafts
for delete
to authenticated
using (doctor_id = auth.uid());

commit;
