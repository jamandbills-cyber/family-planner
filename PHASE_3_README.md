Family Dashboard — Phase 3 Code Files

Adds:
- Personal dashboard (logged-in) at /dashboard
- Device-token-based public dashboards at /d/[token]
- Admin pages to manage projects, tasks, and devices
- API routes for projects, tasks, and devices
- Login page bug fix (password no longer required when using magic link)

Files in this zip:

NEW:
  src/lib/dashboard-data.ts
  src/lib/PersonalDashboard.tsx
  src/lib/KitchenDashboard.tsx
  src/app/dashboard/page.tsx
  src/app/d/[token]/page.tsx
  src/app/admin/projects/page.tsx
  src/app/admin/projects/ProjectsAdminClient.tsx
  src/app/admin/devices/page.tsx
  src/app/admin/devices/DevicesAdminClient.tsx
  src/app/api/admin/projects/route.ts
  src/app/api/admin/tasks/route.ts
  src/app/api/admin/devices/route.ts

REPLACED:
  middleware.ts        (excludes /d/* routes from auth)
  src/app/login/page.tsx  (password now conditionally required)

The Supabase SQL is in chat. Run it BEFORE pushing this code.
