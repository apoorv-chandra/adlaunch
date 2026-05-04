# ⚡ AdLaunch — Quick Start

## Option A: Demo Mode (runs in 2 minutes, zero accounts needed)

```bash
# 1. Go to the web app folder
cd apps/web

# 2. Copy the demo env file
cp .env.demo .env.local

# 3. Install dependencies
npm install

# 4. Start the dev server
npm run dev
```

Open **http://localhost:3000** — you'll land straight on the dashboard with mock data.

---

## Option B: Full Mode (with real auth, DB, and Meta integration)

```bash
# 1. Install all packages from root
npm install

# 2. Copy and fill in environment variables
cp .env.example apps/web/.env.local
cp .env.example apps/api/.env.local

# Required vars to fill in:
# - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY  → from clerk.com
# - CLERK_SECRET_KEY                  → from clerk.com
# - DATABASE_URL                      → from neon.tech
# - UPSTASH_REDIS_REST_URL            → from upstash.com
# - UPSTASH_REDIS_REST_TOKEN          → from upstash.com

# 3. Push the database schema
cd apps/api && npx drizzle-kit push && cd ../..

# 4. Start both servers in separate terminals
# Terminal 1:
cd apps/web && npm run dev

# Terminal 2:
cd apps/api && npm run dev
```

Web: http://localhost:3000
API: http://localhost:8787

---

## Deploy to Vercel (Demo Mode — free, 2 minutes)

1. Push this repo to GitHub
2. Go to vercel.com → New Project → Import your repo
3. Set Root Directory to `apps/web`
4. Add environment variable: `NEXT_PUBLIC_DEMO_MODE=true`
5. Click Deploy

Done! Your app is live.

---

## What's built so far

- ✅ Dashboard with AI campaign score, recommendations, campaign table
- ✅ Campaign Wizard (5-step: Objective → Audience → Budget → Creative → Review)
- ✅ Settings page with Meta Ads connection UI
- ✅ Full Hono.js API (Cloudflare Workers) with all routes
- ✅ Drizzle ORM schema (12 tables)
- ✅ Clerk multi-tenant auth
- ✅ Meta Graph API v18+ integration (OAuth + campaign management)
- 🔜 Phase 3: Creative Studio (AI image generation, Style Match)
- 🔜 Phase 4: Stripe billing
- 🔜 Phase 5: Analytics dashboard
