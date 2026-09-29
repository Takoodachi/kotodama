-- Kotodama: progress synced across devices.
--
-- Idempotent: safe to re-run. Paste into Supabase → SQL Editor → Run.
-- Works in its own project or alongside other apps in a shared one: it only
-- adds the kotodama_progress table.
--
-- One row per account holding its whole progress document (spaced-repetition
-- records, streak and per-device answer counts), merged on the device; see
-- src/lib/sync. `version` goes up with every save, and a save only succeeds
-- if the version is still the one it read, so two devices saving at once
-- merge instead of overwriting each other.

create table if not exists public.kotodama_progress (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.kotodama_progress enable row level security;

-- Each account can only see and change its own row.
drop policy if exists kotodama_progress_own on public.kotodama_progress;
create policy kotodama_progress_own on public.kotodama_progress for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke all on public.kotodama_progress from anon;
grant select, insert, update, delete on public.kotodama_progress to authenticated;

create or replace function public.kotodama_touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists kotodama_progress_touch on public.kotodama_progress;
create trigger kotodama_progress_touch before update on public.kotodama_progress
  for each row execute function public.kotodama_touch_updated_at();

notify pgrst, 'reload schema';
