# Family Planner

Weekly family planning app with Google Calendar sync, form collection, and a Sunday meeting view.

---

## Tech Stack

- **Next.js 14** (App Router, TypeScript)
- **NextAuth** — Google OAuth for admin access
- **Google Calendar API** — reads your shared family calendar
- **Vercel** — hosting + cron jobs
- **Twilio** — automated texts (added in a later step)

---

## Setup: Step by Step

### 1. Clone and install

```bash
git clone <your-repo-url>
cd family-planner
npm install
```

### 2. Google Cloud Project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (e.g. "Family Planner")
3. Go to **APIs & Services → Enable APIs**
4. Enable: **Google Calendar API**
5. Go to **APIs & Services → Credentials**
6. Click **Create Credentials → OAuth Client ID**
   - Application type: **Web application**
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google` (for local dev)
     - `https://your-vercel-domain.vercel.app/api/auth/callback/google` (for production)
7. Copy your **Client ID** and **Client Secret**

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Then fill in `.env.local`:

```env
GOOGLE_CLIENT_ID=your_client_id_from_step_2
GOOGLE_CLIENT_SECRET=your_client_secret_from_step_2

# Generate with: openssl rand -base64 32
NEXTAUTH_SECRET=your_random_secret

NEXTAUTH_URL=http://localhost:3000

# Your shared family calendar ID
# Find it: Google Calendar → Settings → [your calendar] → Calendar ID
# Looks like: abc123@group.calendar.google.com
# Or use "primary" for the main calendar of the signed-in account
GOOGLE_CALENDAR_ID=primary

# Comma-separated Google emails that can access the admin/meeting pages
ADMIN_EMAILS=your.email@gmail.com
```

### 4. Update family members

Open `src/lib/family.ts` and replace the placeholder names and phone numbers with your real family.

Phone numbers must be in E.164 format: `+18015551234`

### 5. Run locally

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) — you'll be redirected to sign in with Google.

---

## Deploy to Vercel

1. Push your code to a GitHub repository
2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
3. Add all your environment variables in Vercel's project settings
4. Update `NEXTAUTH_URL` to your Vercel domain: `https://your-app.vercel.app`
5. Add your Vercel domain to the authorized redirect URIs in Google Cloud Console
6. Deploy

---

## Project Structure

```
src/
├── app/
│   ├── admin/              ← Admin setup page (Google OAuth protected)
│   ├── api/
│   │   ├── auth/           ← NextAuth handler
│   │   └── calendar/       ← Google Calendar sync endpoint
│   └── form/
│       ├── kid/[token]/    ← Kids form (coming next)
│       └── adult/[token]/  ← Adults form (coming next)
├── lib/
│   ├── types.ts            ← Shared TypeScript types
│   ├── family.ts           ← Family member config (edit this)
│   ├── auth.ts             ← NextAuth config
│   └── google-calendar.ts  ← Calendar API helpers
```

---

## What's Been Built

- [x] Admin setup page — week calendar, event assignment, dinner grid, standing rules
- [x] Kids form — off-calendar events, shopping list, meeting topics
- [x] Adults form — driving availability, unavailable days, off-calendar events
- [x] Google Calendar API integration

## Coming Next

- [ ] Google Sheets — store form responses
- [ ] Unique tokenized form links per person
- [ ] Meeting page — live review and adjustments
- [ ] Confirm & send — email, texts, calendar invites
- [ ] Twilio — automated Sunday morning texts
- [ ] Vercel Cron — scheduled Sunday send
