# Family Planner

Weekly family planning app with Supabase-backed dashboards, Google Calendar/Sheets workflows, tokenized forms, device dashboards, and Vercel cron jobs.

## Tech Stack

- **Next.js 15** App Router, React 19, TypeScript
- **Supabase** for Auth, Postgres data, and photo storage
- **NextAuth** with Google OAuth for Google Calendar/Sheets/Gmail access in the Sunday planning flow
- **Tailwind CSS** for styling
- **Twilio** for SMS form links
- **Vercel** for hosting and cron

## Setup

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local` with the Supabase, Google, cron, and Twilio values from `.env.example`.

Run locally:

```bash
npm run dev
```

## Supabase

The app expects these public-schema tables: `family_members`, `projects`, `tasks`, `ideas`, `captures`, `device_tokens`, and `sunday_plans`. Local migrations live in `supabase/migrations`.

Admin authorization is based on the linked Supabase family member row:

- `family_members.auth_user_id` must match the signed-in Supabase user.
- `family_members.role` must be `admin` for admin pages and admin APIs.

## Google Access

Supabase controls app/admin membership. The Sunday planning flow also requires Google OAuth because it reads/writes Google Calendar and Sheets and may send Gmail messages.

`ADMIN_EMAILS` is a Google OAuth allowlist. If it is empty, Google sign-in is denied.

## Public Surfaces

This app intentionally keeps some read endpoints public for kitchen/dashboard use, including household dashboard, plan, family, calendar, and photo display data. Do not deploy this way unless anyone with the deployment URL may see that read data.

Writes and admin operations are protected by Supabase admin role checks, scoped device tokens, or the internal `CRON_SECRET`.

## Deploy

1. Add all `.env.example` values to Vercel.
2. Set `NEXTAUTH_URL` to the deployed URL.
3. Add the deployed Google OAuth callback URL: `https://your-app.vercel.app/api/auth/callback/google`.
4. Share the Google Sheet with the service account email from `GOOGLE_SERVICE_ACCOUNT_KEY`.
5. Deploy.

## Useful Commands

```bash
npm run dev
npm run lint
npm run build
```
