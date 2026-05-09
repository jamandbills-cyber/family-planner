-- Move Sunday planning runtime data out of Google Sheets and into Supabase.

create table if not exists form_tokens (
  token       text primary key,
  member_id   text not null references family_members(id) on delete cascade,
  week_start  date not null,
  form_type   text not null check (form_type in ('kid', 'adult')),
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists form_tokens_week_start_idx on form_tokens(week_start);
create index if not exists form_tokens_member_week_idx on form_tokens(member_id, week_start);

create table if not exists form_submissions (
  id            uuid primary key default gen_random_uuid(),
  submitted_at  timestamptz not null default now(),
  member_id     text not null references family_members(id) on delete cascade,
  form_type     text not null check (form_type in ('kid', 'adult')),
  week_start    date not null,
  payload       jsonb not null
);

create index if not exists form_submissions_week_start_idx on form_submissions(week_start);
create index if not exists form_submissions_member_week_idx on form_submissions(member_id, week_start);

create table if not exists published_plans (
  week_start    date primary key,
  confirmed_at  timestamptz not null default now(),
  plan          jsonb not null
);

alter table form_tokens enable row level security;
alter table form_submissions enable row level security;
alter table published_plans enable row level security;

drop policy if exists form_tokens_admin_all on form_tokens;
create policy form_tokens_admin_all on form_tokens
  for all to authenticated
  using (exists (select 1 from family_members where auth_user_id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from family_members where auth_user_id = auth.uid() and role = 'admin'));

drop policy if exists form_submissions_admin_all on form_submissions;
create policy form_submissions_admin_all on form_submissions
  for all to authenticated
  using (exists (select 1 from family_members where auth_user_id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from family_members where auth_user_id = auth.uid() and role = 'admin'));

drop policy if exists published_plans_public_select on published_plans;
create policy published_plans_public_select on published_plans
  for select using (true);

drop policy if exists published_plans_admin_all on published_plans;
create policy published_plans_admin_all on published_plans
  for all to authenticated
  using (exists (select 1 from family_members where auth_user_id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from family_members where auth_user_id = auth.uid() and role = 'admin'));
