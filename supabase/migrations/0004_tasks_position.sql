-- Add a position column to tasks for the input flow's reorder feature.
-- Existing tasks get an initial position derived from created_at,
-- preserving current ordering.

alter table tasks add column if not exists position bigint;

update tasks
   set position = (extract(epoch from created_at) * 1000)::bigint
 where position is null;

create index if not exists tasks_owner_position_idx
  on tasks (owner_id, position);
