-- Doctor Platform RLS Policies
-- Run in Supabase SQL Editor

begin;

-- 1) Ensure tables use RLS
alter table if exists public.doctors enable row level security;
alter table if exists public.patients enable row level security;
alter table if exists public.messages enable row level security;
alter table if exists public.binding_requests enable row level security;

-- 2) Helper function: verify doctor-patient binding relation
create or replace function public.is_bound_pair(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.patients p
    where (p.id = a and p.doctor_id = b)
       or (p.id = b and p.doctor_id = a)
  );
$$;

revoke all on function public.is_bound_pair(uuid, uuid) from public;
grant execute on function public.is_bound_pair(uuid, uuid) to authenticated;

-- 3) doctors policies
-- doctor can read self profile
 drop policy if exists doctors_select_self on public.doctors;
create policy doctors_select_self
on public.doctors
for select
to authenticated
using (id = auth.uid());

-- doctor can update self profile
 drop policy if exists doctors_update_self on public.doctors;
create policy doctors_update_self
on public.doctors
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- 4) patients policies
-- patient can read self, doctor can read own patients
 drop policy if exists patients_select_self_or_doctor on public.patients;
create policy patients_select_self_or_doctor
on public.patients
for select
to authenticated
using (
  id = auth.uid() or doctor_id = auth.uid()
);

-- patient can update own basic profile; doctor_id must not be changed by patient
 drop policy if exists patients_update_self on public.patients;
create policy patients_update_self
on public.patients
for update
to authenticated
using (id = auth.uid())
with check (
  id = auth.uid()
  and doctor_id is not distinct from (
    select p.doctor_id
    from public.patients p
    where p.id = auth.uid()
  )
);

-- doctor can bind patient: only when patient unbound or already bound to current doctor
 drop policy if exists patients_update_bind_by_doctor on public.patients;
create policy patients_update_bind_by_doctor
on public.patients
for update
to authenticated
using (
  exists (select 1 from public.doctors d where d.id = auth.uid())
  and (doctor_id is null or doctor_id = auth.uid())
)
with check (
  exists (select 1 from public.doctors d where d.id = auth.uid())
  and doctor_id = auth.uid()
);

-- 5) binding_requests policies
-- patient creates own request
 drop policy if exists binding_requests_insert_self on public.binding_requests;
create policy binding_requests_insert_self
on public.binding_requests
for insert
to authenticated
with check (patient_id = auth.uid());

-- patient reads own requests
 drop policy if exists binding_requests_select_self on public.binding_requests;
create policy binding_requests_select_self
on public.binding_requests
for select
to authenticated
using (patient_id = auth.uid());

-- doctor can read valid request by token (for binding flow)
 drop policy if exists binding_requests_select_for_doctor on public.binding_requests;
create policy binding_requests_select_for_doctor
on public.binding_requests
for select
to authenticated
using (
  exists (select 1 from public.doctors d where d.id = auth.uid())
);

-- doctor can mark request used
 drop policy if exists binding_requests_update_doctor on public.binding_requests;
create policy binding_requests_update_doctor
on public.binding_requests
for update
to authenticated
using (
  exists (select 1 from public.doctors d where d.id = auth.uid())
)
with check (
  exists (select 1 from public.doctors d where d.id = auth.uid())
);

-- 6) messages policies
-- read only own incoming/outgoing messages and must be bound pair
 drop policy if exists messages_select_own_bound on public.messages;
create policy messages_select_own_bound
on public.messages
for select
to authenticated
using (
  (sender_id = auth.uid() or receiver_id = auth.uid())
  and public.is_bound_pair(sender_id, receiver_id)
);

-- send message only as self and only to bound doctor/patient
 drop policy if exists messages_insert_own_bound on public.messages;
create policy messages_insert_own_bound
on public.messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and public.is_bound_pair(sender_id, receiver_id)
);

-- receiver can update message (used for is_read)
 drop policy if exists messages_update_receiver on public.messages;
create policy messages_update_receiver
on public.messages
for update
to authenticated
using (
  receiver_id = auth.uid()
  and public.is_bound_pair(sender_id, receiver_id)
)
with check (
  receiver_id = auth.uid()
  and public.is_bound_pair(sender_id, receiver_id)
);

commit;
