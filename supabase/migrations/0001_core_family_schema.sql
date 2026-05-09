-- Core family dashboard schema.
-- Baseline taken from the connected Supabase project so fresh environments can
-- reproduce the tables the app already depends on.

create extension if not exists pgcrypto;

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

create table if not exists family_members (
  id            text primary key,
  username      text not null unique,
  email         text not null unique,
  display_name  text not null,
  type          text not null check (type in ('adult', 'child')),
  role          text not null default 'member' check (role in ('admin', 'member')),
  phone         text,
  color         text,
  can_drive     boolean not null default false,
  ics_feeds     text[] default '{}',
  auth_user_id  uuid unique references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

drop trigger if exists family_members_updated_at on family_members;
create trigger family_members_updated_at before update on family_members
  for each row execute function set_updated_at();

create table if not exists projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  color       text,
  owner_id    text not null references family_members(id) on delete cascade,
  is_shared   boolean not null default false,
  status      text not null default 'active' check (status in ('active', 'archived')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists projects_updated_at on projects;
create trigger projects_updated_at before update on projects
  for each row execute function set_updated_at();

create table if not exists tasks (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references projects(id) on delete cascade,
  text          text not null,
  owner_id      text not null references family_members(id) on delete cascade,
  creator_id    text not null references family_members(id) on delete cascade,
  due_date      date,
  pinned        boolean not null default false,
  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  position      bigint
);

drop trigger if exists tasks_updated_at on tasks;
create trigger tasks_updated_at before update on tasks
  for each row execute function set_updated_at();

create table if not exists ideas (
  id          uuid primary key default gen_random_uuid(),
  text        text not null,
  owner_id    text not null references family_members(id) on delete cascade,
  creator_id  text not null references family_members(id) on delete cascade,
  project_id  uuid references projects(id) on delete set null,
  is_shared   boolean not null default false,
  created_at  timestamptz not null default now()
);

create table if not exists captures (
  id           uuid primary key default gen_random_uuid(),
  raw_text     text not null,
  parsed_type  text,
  parsed_id    uuid,
  creator_id   text not null references family_members(id) on delete cascade,
  created_at   timestamptz not null default now()
);

create table if not exists device_tokens (
  id            uuid primary key default gen_random_uuid(),
  token         text not null unique,
  label         text not null,
  view_type     text not null check (view_type in ('kitchen', 'personal')),
  member_id     text references family_members(id) on delete cascade,
  revoked       boolean not null default false,
  last_seen_at  timestamptz,
  created_at    timestamptz not null default now(),
  orientation   text default 'landscape' check (orientation in ('landscape', 'portrait'))
);

alter table family_members enable row level security;
alter table projects enable row level security;
alter table tasks enable row level security;
alter table ideas enable row level security;
alter table captures enable row level security;
alter table device_tokens enable row level security;

drop policy if exists fm_select_all on family_members;
create policy fm_select_all on family_members
  for select to authenticated using (true);

drop policy if exists fm_update_own on family_members;
create policy fm_update_own on family_members
  for update to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

drop policy if exists proj_select on projects;
create policy proj_select on projects
  for select to authenticated
  using (
    is_shared = true
    or owner_id in (select id from family_members where auth_user_id = auth.uid())
  );

drop policy if exists proj_admin_write on projects;
create policy proj_admin_write on projects
  for all to authenticated
  using (exists (select 1 from family_members where auth_user_id = auth.uid() and role = 'admin'));

drop policy if exists task_select on tasks;
create policy task_select on tasks
  for select to authenticated
  using (
    owner_id in (select id from family_members where auth_user_id = auth.uid())
    or creator_id in (select id from family_members where auth_user_id = auth.uid())
    or exists (select 1 from family_members where auth_user_id = auth.uid() and role = 'admin')
  );

drop policy if exists task_write on tasks;
create policy task_write on tasks
  for all to authenticated
  using (
    owner_id in (select id from family_members where auth_user_id = auth.uid())
    or creator_id in (select id from family_members where auth_user_id = auth.uid())
    or exists (select 1 from family_members where auth_user_id = auth.uid() and role = 'admin')
  );

drop policy if exists idea_select on ideas;
create policy idea_select on ideas
  for select to authenticated
  using (
    is_shared = true
    or owner_id in (select id from family_members where auth_user_id = auth.uid())
  );

drop policy if exists idea_write on ideas;
create policy idea_write on ideas
  for all to authenticated
  using (
    owner_id in (select id from family_members where auth_user_id = auth.uid())
    or exists (select 1 from family_members where auth_user_id = auth.uid() and role = 'admin')
  );

drop policy if exists capture_select on captures;
create policy capture_select on captures
  for select to authenticated
  using (creator_id in (select id from family_members where auth_user_id = auth.uid()));

drop policy if exists capture_insert on captures;
create policy capture_insert on captures
  for insert to authenticated
  with check (creator_id in (select id from family_members where auth_user_id = auth.uid()));

create index if not exists projects_owner_id_idx on projects(owner_id);
create index if not exists tasks_owner_id_idx on tasks(owner_id);
create index if not exists tasks_project_id_idx on tasks(project_id);
create index if not exists ideas_owner_id_idx on ideas(owner_id);
create index if not exists device_tokens_token_idx on device_tokens(token);
