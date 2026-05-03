export type FamilyMember = {
  id: string
  username: string
  email: string
  display_name: string
  type: 'adult' | 'child'
  role: 'admin' | 'member'
  phone: string | null
  color: string | null
  can_drive: boolean
  ics_feeds: string[]
  auth_user_id: string | null
  created_at: string
  updated_at: string
}

export type Project = {
  id: string
  name: string
  color: string | null
  owner_id: string
  is_shared: boolean
  status: 'active' | 'archived'
  created_at: string
  updated_at: string
}

export type Task = {
  id: string
  project_id: string
  text: string
  owner_id: string
  creator_id: string
  due_date: string | null
  pinned: boolean
  completed_at: string | null
  created_at: string
  updated_at: string
}

export type Idea = {
  id: string
  text: string
  owner_id: string
  creator_id: string
  project_id: string | null
  is_shared: boolean
  created_at: string
}

export type Capture = {
  id: string
  raw_text: string
  parsed_type: 'task' | 'idea' | 'project' | 'failed' | null
  parsed_id: string | null
  creator_id: string
  created_at: string
}

export type ProjectWithTasks = Project & {
  tasks: Task[]
}
