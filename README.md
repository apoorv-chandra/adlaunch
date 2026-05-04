# AdLaunch

> AI-Supercharged Social Media Ad Campaign Platform

AdLaunch is a B2C SaaS platform that creates, designs, and runs advertisement campaigns on social media platforms (Meta/Instagram MVP). It uses AI at every step to supercharge performance.

## Features

- **AI Campaign Intelligence** — AI-powered audience targeting, budget optimization, and performance recommendations
- **Style Match** — Upload any reference image; AI generates ads matching that visual style with your content
- **Creative Studio** — AI generation (DALL-E 3 / Gemini) + drag-and-drop template editor + upload
- **Predictive Analytics** — 7-day ROAS forecasting, AI insights, one-click optimizations
- **Dual Billing** — Client owns Meta account (Tier A) or platform-as-intermediary (Tier B via Stripe Connect)
- **Edge-Native** — Deployed on Cloudflare's 300+ PoP network. $0 build cost.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 → Cloudflare Pages |
| Backend API | Hono.js → Cloudflare Workers |
| Database | Neon PostgreSQL + Drizzle ORM |
| Edge DB | Cloudflare D1 |
| Cache | Upstash Redis + Cloudflare KV |
| Media | Cloudflare R2 |
| Auth | Clerk (multi-tenant) |
| Payments | Stripe + Stripe Connect |
| AI | OpenAI DALL-E 3 + Google Gemini |
| Email | Resend |

## Quick Start

### Prerequisites
- Node.js >= 20
- npm >= 10
- Cloudflare account (free)
- Neon account (free)
- Clerk account (free)

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/adlaunch.git
cd adlaunch

# 2. Install dependencies
npm install

# 3. Copy environment variables
cp .env.example .env.local
# Fill in your values in .env.local

# 4. Push database schema
cd apps/api
npx drizzle-kit push

# 5. Start development servers
npm run dev
```

### Development URLs
- Frontend: http://localhost:3000
- API: http://localhost:8787

## Project Structure

```
adlaunch/
├── apps/
│   ├── web/          # Next.js 14 frontend (Cloudflare Pages)
│   └── api/          # Hono.js API (Cloudflare Workers)
├── packages/
│   ├── ui/           # Shared React component library
│   ├── types/        # Shared TypeScript types
│   └── config/       # Shared ESLint, Prettier, tsconfig
└── .github/
    └── workflows/    # CI/CD pipelines
```

## Deployment

### One-time setup
```bash
# Login to Cloudflare
npx wrangler login

# Create R2 bucket
npx wrangler r2 bucket create adlaunch-media

# Create D1 database
npx wrangler d1 create adlaunch-db

# Create KV namespace
npx wrangler kv:namespace create CACHE
```

### Deploy
Push to `main` branch — GitHub Actions deploys automatically.

## License
MIT
