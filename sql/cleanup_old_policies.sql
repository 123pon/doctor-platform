-- Cleanup Old Insecure Policies
-- Run this in Supabase SQL Editor to remove old policies that allow public access

begin;

-- Remove old public-role policies from doctors table
drop policy if exists "Doctors can insert their own records" on public.doctors;
drop policy if exists "Doctors can read" on public.doctors;
drop policy if exists "Doctors can update their own records" on public.doctors;

-- Remove old public-role policies from patients table
drop policy if exists "Patients can insert their own records" on public.patients;
drop policy if exists "Patients can read" on public.patients;
drop policy if exists "Users can insert their own patients" on public.patients;
drop policy if exists "Doctors can read patients" on public.patients;

-- Remove old public-role policies from messages table
drop policy if exists "Users can insert messages" on public.messages;
drop policy if exists "Users can view messages" on public.messages;
drop policy if exists "Users can update messages" on public.messages;

-- Remove old public-role policies from binding_requests table (if any)
drop policy if exists "Users can insert binding requests" on public.binding_requests;
drop policy if exists "Users can read binding requests" on public.binding_requests;

commit;

-- Verify cleanup: should only show authenticated-role policies
select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('doctors', 'patients', 'messages', 'binding_requests')
order by tablename, policyname;
