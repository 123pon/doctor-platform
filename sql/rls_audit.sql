-- Doctor Platform RLS Audit Script
-- Run in Supabase SQL Editor after applying rls_policies.sql

-- =====================================================
-- 1) Check if RLS is enabled on core tables
-- =====================================================
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as force_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('doctors', 'patients', 'messages', 'binding_requests')
order by c.relname;

-- =====================================================
-- 2) Check expected policies exist
-- =====================================================
with expected as (
  select 'public'::text as schemaname, 'doctors'::text as tablename, 'doctors_select_self'::text as policyname union all
  select 'public', 'doctors', 'doctors_insert_self' union all
  select 'public', 'doctors', 'doctors_update_self' union all
  select 'public', 'patients', 'patients_select_self_or_doctor' union all
  select 'public', 'patients', 'patients_insert_self' union all
  select 'public', 'patients', 'patients_update_self' union all
  select 'public', 'patients', 'patients_update_bind_by_doctor' union all
  select 'public', 'binding_requests', 'binding_requests_insert_self' union all
  select 'public', 'binding_requests', 'binding_requests_select_self' union all
  select 'public', 'binding_requests', 'binding_requests_select_for_doctor' union all
  select 'public', 'binding_requests', 'binding_requests_update_doctor' union all
  select 'public', 'messages', 'messages_select_own_bound' union all
  select 'public', 'messages', 'messages_insert_own_bound' union all
  select 'public', 'messages', 'messages_update_receiver'
)
select
  e.schemaname,
  e.tablename,
  e.policyname,
  case when p.policyname is null then 'MISSING' else 'OK' end as status
from expected e
left join pg_policies p
  on p.schemaname = e.schemaname
 and p.tablename = e.tablename
 and p.policyname = e.policyname
order by e.tablename, e.policyname;

-- =====================================================
-- 3) Show all current policies for manual inspection
-- =====================================================
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('doctors', 'patients', 'messages', 'binding_requests')
order by tablename, policyname;

-- =====================================================
-- 4) Data integrity checks
-- =====================================================

-- 4.1 patients.doctor_id points to non-existing doctor
select
  p.id as patient_id,
  p.name as patient_name,
  p.doctor_id
from public.patients p
left join public.doctors d on d.id = p.doctor_id
where p.doctor_id is not null
  and d.id is null;

-- 4.2 binding_requests.patient_id points to non-existing patient
select
  br.id as binding_request_id,
  br.patient_id,
  br.token,
  br.expires_at,
  br.used
from public.binding_requests br
left join public.patients p on p.id = br.patient_id
where p.id is null;

-- 4.3 messages with non-existing sender/receiver
select
  m.id as message_id,
  m.sender_id,
  m.receiver_id,
  m.created_at
from public.messages m
left join public.patients ps on ps.id = m.sender_id
left join public.doctors ds on ds.id = m.sender_id
left join public.patients pr on pr.id = m.receiver_id
left join public.doctors dr on dr.id = m.receiver_id
where (ps.id is null and ds.id is null)
   or (pr.id is null and dr.id is null);

-- 4.4 messages that violate doctor-patient binding relation
-- valid relation: one side is patient and patient.doctor_id = the other side
select
  m.id as message_id,
  m.sender_id,
  m.receiver_id,
  m.created_at
from public.messages m
where not exists (
  select 1
  from public.patients p
  where (p.id = m.sender_id and p.doctor_id = m.receiver_id)
     or (p.id = m.receiver_id and p.doctor_id = m.sender_id)
);

-- 4.5 messages from user to self (usually invalid for this product)
select
  m.id as message_id,
  m.sender_id,
  m.receiver_id,
  m.created_at
from public.messages m
where m.sender_id = m.receiver_id;

-- =====================================================
-- 5) Optional cleanup suggestions (manual run, review first)
-- =====================================================
-- Example: remove invalid messages
-- delete from public.messages m
-- where not exists (
--   select 1
--   from public.patients p
--   where (p.id = m.sender_id and p.doctor_id = m.receiver_id)
--      or (p.id = m.receiver_id and p.doctor_id = m.sender_id)
-- );
