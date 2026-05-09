-- ─── sunday_plans ───────────────────────────────────────────
-- One row per week, replaces the AdminState tab in Google Sheets.

create or replace function set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists sunday_plans (
  week_start  date primary key,
  state       jsonb not null,
  updated_at  timestamptz not null default now()
);

drop trigger if exists sunday_plans_updated_at on sunday_plans;
create trigger sunday_plans_updated_at before update on sunday_plans
  for each row execute function set_updated_at();

alter table sunday_plans enable row level security;

grant select, insert, update on sunday_plans to authenticated;

drop policy if exists sunday_plans_select_all on sunday_plans;
create policy sunday_plans_select_all on sunday_plans
  for select to authenticated using (true);

drop policy if exists sunday_plans_insert_admin on sunday_plans;
create policy sunday_plans_insert_admin on sunday_plans
  for insert to authenticated
  with check (
    exists (
      select 1
      from family_members
      where auth_user_id = auth.uid()
        and role = 'admin'
    )
  );

drop policy if exists sunday_plans_update_admin on sunday_plans;
create policy sunday_plans_update_admin on sunday_plans
  for update to authenticated
  using (
    exists (
      select 1
      from family_members
      where auth_user_id = auth.uid()
        and role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from family_members
      where auth_user_id = auth.uid()
        and role = 'admin'
    )
  );
