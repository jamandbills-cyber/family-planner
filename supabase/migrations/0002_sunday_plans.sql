-- ─── sunday_plans ───────────────────────────────────────────
-- One row per week, replaces the AdminState tab in Google Sheets.
-- The state column holds the full snapshot (events, schoolConfig,
-- dinner, agenda, deadline, deadlineDay, isReady).

create table if not exists sunday_plans (
  week_start  date primary key,
  state       jsonb not null,
  updated_at  timestamptz not null default now()
);

-- Reuse the set_updated_at function created for projects/tasks
create trigger sunday_plans_updated_at before update on sunday_plans
  for each row execute function set_updated_at();

alter table sunday_plans enable row level security;

-- Service role bypasses RLS automatically. Allow authenticated users
-- to read/write (admin pages are gated at the page level via NextAuth).
grant select, insert, update, delete on sunday_plans to authenticated;

create policy sunday_plans_select_all on sunday_plans
  for select using (true);

create policy sunday_plans_insert_all on sunday_plans
  for insert with check (true);

create policy sunday_plans_update_all on sunday_plans
  for update using (true) with check (true);
