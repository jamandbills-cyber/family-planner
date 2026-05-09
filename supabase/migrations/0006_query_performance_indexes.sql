-- Indexes aligned with the hottest dashboard and planning queries.

create index if not exists tasks_open_owner_project_idx
  on tasks (owner_id, project_id, due_date, created_at desc)
  where completed_at is null;

create index if not exists tasks_open_project_idx
  on tasks (project_id, due_date, created_at desc)
  where completed_at is null;

create index if not exists ideas_owner_created_at_idx
  on ideas (owner_id, created_at desc);

create index if not exists form_submissions_latest_member_idx
  on form_submissions (week_start, member_id, submitted_at desc);

create index if not exists published_plans_confirmed_at_idx
  on published_plans (confirmed_at desc);

create index if not exists device_tokens_member_id_idx
  on device_tokens (member_id);

create index if not exists tasks_creator_id_idx
  on tasks (creator_id);

create index if not exists ideas_creator_id_idx
  on ideas (creator_id);

create index if not exists ideas_project_id_idx
  on ideas (project_id);
