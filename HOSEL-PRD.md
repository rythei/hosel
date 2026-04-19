# Hosel.io — Product Requirements Document
### Phase 1: Tournament Pools
**Last updated:** April 16, 2026
**Authors:** Tom Murphy, Ryan Theisen

---

## 1. Overview

Hosel is a platform for golfers to run tournament pick'em pools with their friends. Users create or join pools tied to professional golf tournaments, draft a roster of players across skill tiers, and compete for token-based payouts across each round and overall.

Phase 1 focuses exclusively on **pro tournament pools** — the format already validated by the group's Masters pool run through oigolf.club. The goal is to generalize that experience into a product anyone can spin up for their friend group.

### What Hosel is NOT (Phase 1)
- Not a sportsbook or gambling platform — tokens are for tracking only, users settle among themselves
- Not a fantasy golf season-long game
- Not an on-course game tracker (that's Phase 2)
- Not a public marketplace for pools (that's Phase 4)

---

## 2. Users & Personas

### Pool Organizer ("The Commissioner")
The person in the friend group who runs the pool. Today they use spreadsheets, group texts, and Venmo. They want to:
- Set up a pool in under 5 minutes
- Share a link and have everyone self-serve their picks
- Not chase people for payments or manually calculate scores
- Look like a hero for running a slick operation

### Pool Participant ("The Degenerate")
The friends who join. They want to:
- Make their picks quickly on their phone
- Check the leaderboard obsessively during the tournament
- Talk trash with context (see everyone's picks)
- Know exactly where they stand in payouts at all times

---

## 3. Core User Flows

### Flow 1: Create a Pool
1. Organizer signs up / logs in
2. Taps "Create a Pool"
3. Selects tournament from upcoming schedule (auto-populated from data feed)
4. Configures pool settings:
   - Pool name (default: "[Tournament] Pool")
   - Buy-in amount (in tokens)
   - Max entries
   - Number of tiers (3–6, default 5)
   - Scoring method (best 3 of 5, best 4 of 5, all scores)
   - Cut rule (need X players to make cut for weekend/overall eligibility)
   - Payout structure (preset templates + custom option)
   - Entry deadline (default: 1 hour before Round 1 tee time)
5. Confirms and gets a **share link** + **pool code**
6. System auto-generates tiers based on tournament odds/rankings

### Flow 2: Join a Pool & Make Picks
1. Participant receives invite link or enters pool code
2. Signs up / logs in (minimal friction — email + password, or OAuth)
3. Sees pool details (tournament, buy-in, rules, deadline)
4. Agrees to the buy-in — this is an acknowledgment that they owe the organizer
5. If organizer has "require buy-in confirmation" ON: player sees a "pending" state until organizer confirms payment received. Player can browse tiers and draft picks, but picks won't lock in until confirmed.
6. Picks 1 player from each tier (radio select per tier)
7. Enters tiebreaker predictions (lowest score per round)
8. Confirms picks — receives confirmation with summary
9. Can edit picks until the entry deadline

### Flow 3: Live Tournament Tracking
1. Once tournament begins, leaderboard activates
2. Scores update automatically via tournament data API
3. Leaderboard shows:
   - Each participant's name, picks, and score
   - Round-by-round breakdown
   - Current payout positions (1st/2nd/3rd per round, overall leader)
   - Cut status for each participant's players
4. Round winners are marked at end of each day
5. Overall winner crowned after Round 4

### Flow 4: Settlement (Admin-Driven)
1. After tournament ends, final standings are locked
2. Token payouts are calculated automatically based on pool rules
3. **Admin sees** a Distribution Checklist: every individual payout owed, listed by player and category (e.g., "R1 1st Place", "Overall Winner")
4. As the admin pays each winner in the real world (Venmo, cash, etc.), they mark each payout as "Distributed" in the app
5. Progress tracked: "4 of 8 payouts distributed"
6. **Participants see** the payout breakdown (read-only) and whether their payout has been marked as distributed by the admin
7. Once all payouts are marked distributed, admin closes the pool → it moves to History
8. All token amounts zero out — nothing carries to future pools
9. Hosel does NOT process real money — the admin handles all payments outside the app

---

## 4. Feature Requirements

### 4.1 Authentication & Accounts
- Email/password signup + login
- OAuth (Google, Apple) — stretch goal for v1
- Display name + avatar (initials-based default)
- Account settings (change password, display name)
- Lifetime pool stats (pools played, podium finishes) — no persistent token balance

### 4.2 Pool Management
- **Create pool** with configurable rules (see Flow 1)
- **Invite system**: shareable link + 6-character alphanumeric code
- **Tier generation**: auto-assign players to tiers based on tournament odds or world ranking
  - Organizer can manually adjust tier assignments before deadline
- **Deadline enforcement**: picks lock at the configured deadline
- **Admin dashboard** for organizer:
  - Entry count, who hasn't picked yet
  - Buy-in confirmation toggle: ON = admin must confirm each player's payment before picks go live; OFF = honor system, auto-confirmed on join
  - Player list with buy-in status (pending/confirmed) and pick status
  - Edit pool settings before first entry (some fields lock after that)
  - Cancel pool option (before tournament starts)
  - Copy invite link / code

### 4.3 Pick Selection
- Tier-by-tier player selection (1 per tier)
- Player cards show: name, world ranking, tournament odds, recent form (stretch)
- Tiebreaker inputs: predicted lowest score per round
- Edit picks until deadline
- Confirmation screen with full roster summary

### 4.4 Scoring Engine
- Pulls live scores from tournament data API
- Calculates daily totals using configured scoring method:
  - **Best 3 of 5**: sum of lowest 3 player scores each round
  - **Best 4 of 5**: sum of lowest 4 player scores each round
  - **All 5**: sum of all 5 player scores each round
- Handles missed cuts:
  - Players who miss the cut receive no score for Rounds 3–4
  - If a participant has fewer than the required number of players making the cut, they're ineligible for weekend/overall payouts
- Tiebreaker resolution: sum of predicted lowest scores vs. actual lowest scores, closest wins
- Withdrawal handling: if a picked player WDs, that slot scores as no score (worst case)

### 4.5 Leaderboard
- **Real-time updates** during tournament play
- **Round tabs**: R1, R2, R3, R4, Total
- Each row shows: rank, participant name, their picks (abbreviated), round scores, total
- **Payout indicator**: highlight 1st/2nd/3rd positions
- **Pool stats bar**: total entries, pot size, current leader, tournament round/status
- **Payout breakdown banner**: shows token amounts for each position
- Movement indicators: up/down arrows showing position changes (stretch)

### 4.6 Token System
- Abstract unit — no real currency, no conversion rate
- **Tokens are pool-scoped, not user-scoped.** There is no persistent wallet, no global balance, no tokens carrying over between pools.
- Each pool is a self-contained ledger: admin sets buy-in → players agree → tournament plays → payouts calculated → admin distributes → pool zeros out
- The admin collects and distributes real-world payments outside the app. Hosel tracks the obligations and payouts only.
- Token amounts displayed throughout: buy-in on pool cards, payout positions on leaderboard, distribution amounts on settlement
- Disclaimer visible during pool creation and join: "Tokens are for tracking only. The pool organizer collects and distributes payments outside of Hosel."

### 4.7 Settlement & Distribution (Admin-Driven)
- **Final standings page** after tournament completes
- Payout summary: who won what, per round and overall
- **Distribution Checklist (admin only)**: each individual payout listed as a line item the admin marks as "Distributed" as they pay in the real world
- **Participant view**: read-only payout breakdown + status of their own payouts (pending/paid)
- Progress tracking: "X of Y payouts distributed"
- Once all distributed, admin closes pool → moves to History, tokens zero out
- Pool moves to "History" with full archive of picks, scores, payouts

### 4.8 Notifications (stretch for v1)
- Entry deadline reminder (email or push)
- "Tournament started — leaderboard is live"
- Daily round results summary
- "You finished in Xth place" at tournament end

---

## 5. Tier & Scoring Configuration

### Default Tier Setup (5 tiers)
Tiers are auto-generated by splitting the tournament field by betting odds or world ranking:

| Tier | Label | Approx. Odds Range | Description |
|------|-------|-------------------|-------------|
| 1 | Elite | +400 to +1200 | Top 5–6 favorites |
| 2 | Contenders | +1200 to +3000 | Strong players with realistic win equity |
| 3 | Dark Horses | +3000 to +5500 | Solid players, lower win probability |
| 4 | Sleepers | +5500 to +12000 | Capable but unlikely winners |
| 5 | Longshots | +12000+ | Fan favorites, past champions, wildcards |

Organizer can adjust tier boundaries and player assignments.

### Default Payout Structure
| Category | % of Pot | Split |
|----------|----------|-------|
| Round 1 | 20% | 1st: 50%, 2nd: 35%, 3rd: 15% |
| Round 2 | 20% | 1st: 50%, 2nd: 35%, 3rd: 15% |
| Round 3 | 20% | 1st: 50%, 2nd: 35%, 3rd: 15% |
| Round 4 | 20% | 1st: 50%, 2nd: 35%, 3rd: 15% |
| Overall | 20% | Winner takes all |

Organizer can select from preset templates or customize.

---

## 6. Tournament Data

### Required Data Points
- Tournament schedule (name, dates, course, field)
- Player field with world rankings and betting odds
- Live round-by-round scores (updated as play happens)
- Cut line and player cut status
- Player withdrawal/DQ status

### Potential Data Sources
- **SportRadar Golf API** — comprehensive, used by major media. Expensive (~$500+/mo).
- **SportsData.io (SportsDataIO)** — more affordable tiers, good golf coverage.
- **ESPN / PGA Tour unofficial APIs** — free but unstable, no SLA, could break.
- **The Odds API** — good for odds data specifically, affordable.
- **Manual fallback** — organizer can manually enter/override scores if API is down.

### Decision needed
Research and select a data provider before build. Key factors: cost, reliability, update frequency during play, and whether odds data is included or separate.

---

## 7. Technical Requirements (Pending Ryan's Input)

### Known
- Full-stack app with auth and database (existing oigolf.club)
- Needs to support real-time or near-real-time score updates
- Mobile-first responsive design (most users will check on phone during tournament)
- Invite links that work cleanly in iMessage/WhatsApp previews (Open Graph tags)

### To Confirm with Ryan
- [ ] Current framework (React/Next.js? Vue? Plain JS?)
- [ ] Database (PostgreSQL? Firebase? Supabase?)
- [ ] Auth provider (custom? Firebase Auth? Auth0? Clerk?)
- [ ] Hosting (Vercel? Netlify? AWS?)
- [ ] Current tournament data source (API or manual?)
- [ ] Repo location and access

### Recommended Architecture (pending stack confirmation)
- **Frontend**: React or Next.js (SSR for leaderboard SEO + share previews)
- **Backend**: API routes (Next.js) or separate Express/FastAPI server
- **Database**: PostgreSQL via Supabase or PlanetScale
- **Auth**: Clerk or Supabase Auth (lowest friction)
- **Real-time**: Supabase Realtime or WebSockets for live leaderboard
- **Hosting**: Vercel (frontend) + managed DB
- **Payments**: None for Phase 1 — token system is internal

---

## 8. Design

### Brand
- **Name**: Hosel
- **Domain**: hosel.io
- **Tagline**: "Pick your players. Follow the action."
- **Tone**: Insider golf culture meets clean tech product. Fun but not corny.
- **Logo**: Stylized club head/shaft showing the hosel junction

### Visual Design
- Dark mode primary (dark greens, cream text)
- Accent: Augusta green (#2d8a54) + gold (#c9a84c) for winners/tokens
- Token icon: concentric circle chip mark (poker chip × ball marker)
- Mobile-first, max-width container for desktop
- Typography: Inter or similar clean sans-serif

### Key Screens (mockups complete)
1. **Home / Pools** — list of user's active pools + create/join CTAs
2. **Create Pool** — 3-step wizard (Tournament → Rules → Payouts)
3. **Pick Players** — tier-by-tier selection with tiebreaker inputs
4. **Leaderboard** — live standings with round tabs and payout info
5. **Pool History** — archived results from past tournaments
6. **Settlement** — post-tournament payout breakdown and tracking

---

## 9. Success Metrics (Phase 1)

- **Pools created**: target 10+ pools by end of 2026 PGA Tour season
- **Users**: target 100+ accounts
- **Completion rate**: >80% of pool entrants submit picks before deadline
- **Retention**: users return for the next major tournament
- **NPS**: qualitative — do friends say "this is way better than the spreadsheet"?

---

## 10. Open Questions

1. **Data provider**: Which tournament API gives us the best cost/coverage tradeoff? Need to research and decide.
2. ~~**Token economics**~~: RESOLVED — tokens are pool-scoped with no persistent balance. Each pool is a self-contained ledger that zeros out after settlement.
3. **Multiple entries**: Can a user enter the same pool twice with different picks? Probably not for v1.
4. **Private vs. public pools**: Phase 1 is private only (invite link). When do we open public pools?
5. **Mobile app**: Phase 1 is responsive web. At what point do we build native (iOS/Android)?
6. **Legal review**: Get a quick gut-check from a lawyer on the token/settlement model to confirm we're in the clear.

---

## 11. Phase 1 Milestones

| Milestone | Target | Status |
|-----------|--------|--------|
| Domain + branding | April 2026 | ✅ Done |
| Screen mockups | April 2026 | ✅ Done |
| PRD | April 2026 | ✅ Done |
| Stack confirmed with Ryan | April 2026 | ⏳ Pending |
| Data provider selected | April 2026 | ⬜ Not started |
| Core build (auth, pools, picks) | May 2026 | ⬜ Not started |
| Scoring engine + leaderboard | May 2026 | ⬜ Not started |
| Beta with friend group | PGA Championship (May 15) | ⬜ Target |
| Iterate based on feedback | June 2026 | ⬜ Not started |
| US Open pool (public-ish launch) | June 18 | ⬜ Stretch target |
