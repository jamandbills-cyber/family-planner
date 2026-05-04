-- Add a position column to tasks so the input flow can reorder them.
-- Existing tasks get an initial position derived from their created_at timestamp,
-- preserving current ordering.

alter table tasks add column if not exists position bigint;

update tasks
   set position = (extract(epoch from created_at) * 1000)::bigint
 where position is null;

create index if not exists tasks_member_position_idx
  on tasks (member_id, position);
