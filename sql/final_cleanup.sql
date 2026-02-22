-- Final Cleanup: Remove Remaining Public Policies
-- Run this in Supabase SQL Editor

begin;

-- Remove remaining public-role policies from doctors table
drop policy if exists "Doctors can manage own record" on public.doctors;
drop policy if exists "Users can insert own doctor record" on public.doctors;

-- Remove remaining public-role policies from patients table
drop policy if exists "Doctors can view their patients" on public.patients;
drop policy if exists "Patients can view own patient record" on public.patients;
drop policy if exists "Users can insert own patient record" on public.patients;

-- Remove remaining public-role policies from messages table
drop policy if exists "Users can view their own messages" on public.messages;

commit;

-- Final verification: should ONLY show authenticated policies
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
