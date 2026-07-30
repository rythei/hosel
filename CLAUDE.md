# Hosel — Development Guide

Golf tournament pick'em pool platform. Users create or join pools tied to PGA Tour events, pick players from tiered groups, and compete for token-based payouts.

## Stack

- **Framework**: Next.js 15 (App Router, TypeScript)
- **Database + Auth + Realtime**: Supabase (project: `sxbzajoylgzsrosotwnz`, region: West US North California)
- **Hosting**: Vercel (project: `ryan-theisens-projects/hosel`)
- **Repo**: `github.com/rythei/hosel`
- **Live URL**: `https://hosel.io` (custom domain via Porkbun → Vercel; `hosel.vercel.app` still works as fallback)
- **Score data**: ESPN unofficial API (`site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard?event={id}`)

## Local Development

```bash
npm install
npm run dev        # http://localhost:3000
```

Env vars are in `.env.local` (gitignored). Keys:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `CRON_SECRET`

## Deployment

Push to `main` (or any branch linked in Vercel) triggers auto-deploy.

Manual deploy: `vercel deploy --prod`

Vercel env vars are set in the dashboard — do not commit `.env.local`.

After deploying to a new URL, add it to Supabase:
**Supabase Dashboard → Authentication → URL Configuration → Site URL + Redirect URLs**

## Database

Supabase project ref: `sxbzajoylgzsrosotwnz`

### Schema migrations

```bash
supabase link --project-ref sxbzajoylgzsrosotwnz
supabase db push                    # push new migrations to remote
supabase db query --linked -f supabase/seed.sql   # run seed SQL
```

Migrations live in `supabase/migrations/`. Always create a new numbered file (e.g. `003_...sql`) rather than editing existing ones.

### Tables

| Table | Purpose |
|-------|---------|
| `users` | Extended auth profiles (auto-created on signup via trigger) |
| `tournaments` | PGA Tour events — seeded manually or via ESPN sync |
| `tournament_players` | Field for each tournament, with tier/odds/scores |
| `pools` | Pool config: buy-in, tiers, scoring method, invite code |
| `pool_entries` | A user's entry in a pool: picks + tiebreaker + buyin status |
| `pool_results` | Computed scores per entry per round (post-tournament) |
| `pool_payouts` | Individual payout line items — admin marks as distributed |

### Adding a tournament + player field

Insert a row into `tournaments` with `status = 'upcoming'`, `external_id` = the ESPN event ID, and **`tour`** = the ESPN league that event ID belongs to (`pga`, `lpga`, `champions-tour`, `liv`, `dpwt`). Then insert rows into `tournament_players` with `tier` (1–5) and `odds` set. The Create Pool wizard will pick it up automatically.

⚠️ **`tour` must match the event ID.** ESPN's scoreboard is league-scoped and does *not* 404 on an event ID from another league — it silently returns that league's current event instead. A mismatch therefore syncs a completely different tournament's field, matches zero player names, and leaves the leaderboard blank with no error. The admin UI defaults to `pga`; change it for anything else.

Pull a field to CSV with `python scripts/pull_field.py <event_id> --tour lpga`.

Example seed is in `supabase/seed.sql`.

## Score Sync

**Endpoints**:
- `GET /api/scores` — syncs all `in_progress` tournaments. Protected by `CRON_SECRET`.
- `POST /api/scores` — syncs one tournament (`{ "tournamentId": "..." }`), any status. Admin-session only; this is what the **Sync scores** button in `/admin` calls.

Fetches the ESPN scoreboard by `external_id` + `tour` and writes scores into `tournament_players`, matching on player `name`.

The response reports `matched` / `unmatched` counts. **`unmatched` should be near zero** — a high count means our stored player names disagree with ESPN's spellings, which silently produces an empty leaderboard. `detectedPar` reports the par derived from the field; a wrong stored `par` is corrected automatically.

To trigger manually:
```bash
curl https://hosel.io/api/scores \
  -H "Authorization: Bearer hosel-cron-2026"
```

The Vercel cron (`vercel.json`) is disabled on Hobby plan. To enable automated syncs, upgrade to Vercel Pro and restore:
```json
{ "crons": [{ "path": "/api/scores", "schedule": "*/10 * * * *" }] }
```

## Key Source Files

```
src/
  app/
    page.tsx                          Home / pool list
    create/page.tsx                   Create pool wizard (3 steps)
    join/page.tsx                     Join by invite code
    pool/[id]/pick/                   Pick players (tier selection)
    pool/[id]/leaderboard/            Live standings
    pool/[id]/manage/                 Admin dashboard
    pool/[id]/settlement/             Post-tournament payout tracking
    api/scores/route.ts               ESPN score sync endpoint
    api/pools/[id]/leaderboard/       Leaderboard JSON API (used by Realtime)
  lib/
    scoring.ts                        Scoring engine (best X of Y, rankings, payouts)
    espn.ts                           ESPN API parser (ported from oigolf.club Apps Script)
    supabase/client.ts                Browser Supabase client
    supabase/server.ts                Server Supabase client (RSC + API routes)
  components/
    NavBar.tsx                        Sticky nav, logo, avatar
    HoselLogo.tsx                     SVG logo, ChipIcon, TokenAmount components
  middleware.ts                       Auth redirect (protects all routes except /auth/*)
  types/index.ts                      Shared TypeScript types
```

## Design System

All design tokens are CSS variables in `src/app/globals.css`. Key colors:
- `--green` / `--green-light` / `--green-dark` — brand greens
- `--gold` / `--chip` — winner/token colors
- `--bg` / `--surface` / `--card` — dark mode backgrounds
- `--tier-1` through `--tier-5` — per-tier accent colors (gold, green, blue, purple, coral)

Reusable CSS classes: `.btn-primary`, `.btn-secondary`, `.btn-gold`, `.card`, `.input`, `.badge`, `.selection-row`, `.tab-bar`, `.token-disclaimer`, `.skeleton`.

## Token Model

Tokens are **pool-scoped** — no persistent wallet. Each pool is a self-contained ledger:
1. Admin sets buy-in → players join and agree → scores compute → admin distributes → pool closes
2. Hosel never handles real money. Tokens are tracking only.
3. No `token_balance` on users. All token data lives on pool/entry/payout rows.

## Phase 1 Target

Beta at **PGA Championship, May 15 2026**. Wider launch at US Open, June 18 2026 (stretch).

## Team

- **Ryan Theisen** — engineer (ryanctheisen@gmail.com)
- **Tom Murphy** — product/design
