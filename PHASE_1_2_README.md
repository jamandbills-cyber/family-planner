Family Dashboard — Phase 1 + 2 Code Files

This zip contains the code files only. The Supabase SQL schema is
delivered separately in chat for you to paste into the Supabase SQL editor.

Files in this zip:

NEW:
  middleware.ts
  scripts/migrate-roster.ts
  src/lib/supabase.ts
  src/lib/types/dashboard.ts
  src/app/login/page.tsx
  src/app/profile/page.tsx
  src/app/profile/ProfileClient.tsx
  src/app/admin/family/page.tsx
  src/app/admin/family/FamilyAdminClient.tsx
  src/app/api/auth/login/route.ts
  src/app/api/auth/magic-link/route.ts
  src/app/api/auth/logout/route.ts
  src/app/api/admin/family/route.ts

REPLACED:
  src/app/api/family/route.ts   (now reads from Supabase, returns same shape)
