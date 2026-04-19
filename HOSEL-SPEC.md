# Hosel.io — Project Context

Use this document as system instructions for any Claude chat or Project related to Hosel. It ensures every conversation has full context on what we're building, what's been decided, and current status.

---

## What is Hosel?

Hosel (hosel.io) is a platform for golfers to run tournament pick'em pools with friends. Users create or join pools tied to professional golf tournaments, draft a roster of players across skill tiers, and compete for token-based payouts across each round and overall.

The name comes from the hosel — the part of a golf club where the shaft meets the head. Every golfer knows it from the dreaded "hosel rocket" (a shank). It's insider golf humor: short, memorable, and available as a .io domain.

## Team

- **Tom Murphy** — product, design, business
- **Ryan Theisen** — ML scientist at NewLimit, built the original version (oigolf.club), lead engineer

## Origin

Ryan built a simple full-stack web app (oigolf.club) for friends to run a Masters tournament pool. The rules:
- Pick 1 player from each of 5 tiers (tiers based on odds)
- Best 3 of 5 player scores count each day
- Tiebreaker: predict the lowest score in the field each round
- Need 3+ players to make the cut for Round 3/4 and overall eligibility
- Payout: 20% of pot per round (50/35/15 split for 1st/2nd/3rd) + 20% to overall winner
- $25 buy-in, settled among friends

We're generalizing this into a product anyone can use.

## Current Phase: Phase 1 — Tournament Pools

Phase 1 focuses ONLY on pro tournament pick'em pools. We are NOT building:
- On-course games (Phase 2)
- Course/club operator tools (Phase 3)
- Public pools or social features (Phase 4)

## Key Product Decisions Already Made

1. **Token system, not real money.** All amounts shown as tokens (custom chip icon). Tokens are **pool-scoped** — they exist only within a single pool and zero out after settlement. There is no persistent wallet or cross-pool balance. The pool admin collects and distributes real money outside the app; Hosel is the scorekeeper and settlement tracker. Admin can toggle whether they need to confirm each player's buy-in before picks go live. A disclaimer is shown during pool creation and join.

2. **Brand & design direction.** Dark mode, Augusta-green palette (#2d8a54), gold accents (#c9a84c) for winners/tokens. Mobile-first responsive. Custom logo: stylized club head/shaft showing the hosel junction. Token icon: concentric circle chip (poker chip × ball marker hybrid). Interactive screen mockups have been built for all core screens.

3. **Domain.** hosel.io — registered on Porkbun. Email forwarding set up (hello@hosel.io).

4. **GitHub org.** [To be created — hoselio or hosel-io]

5. **Core screens designed:**
   - Home / Pools list — active pools, create/join CTAs, how it works
   - Create Pool — 3-step wizard (Tournament → Rules → Payouts)
   - Pick Players — tier-by-tier selection with tiebreaker inputs
   - Leaderboard — live standings, round tabs, payout breakdown
   - Admin Dashboard — entry management, buy-in confirmation, pool settings
   - Settlement — post-tournament payout distribution tracking (admin-driven)
   - Pool History — archived past tournaments
   - Account — profile, lifetime stats

6. **Payout structure (default):**
   - Round 1–4: each 20% of pot, split 50/35/15 for 1st/2nd/3rd
   - Overall: 20% of pot to winner
   - Organizer can customize

7. **Tier system (default 5 tiers):**
   - Tier 1 (Elite): top favorites, ~+400 to +1200 odds
   - Tier 2 (Contenders): +1200 to +3000
   - Tier 3 (Dark Horses): +3000 to +5500
   - Tier 4 (Sleepers): +5500 to +12000
   - Tier 5 (Longshots): +12000+
   - Auto-generated from odds/rankings, organizer can adjust
   - Configurable: 3–6 tiers

8. **Scoring methods supported:**
   - Best 3 of 5 (default)
   - Best 4 of 5
   - All 5 scores

## Tech Stack (Pending Confirmation from Ryan)

Ryan's existing app (oigolf.club) is full-stack with auth and a database. We are waiting on Ryan to confirm:
- [ ] Framework (React/Next.js? Vue? Plain JS?)
- [ ] Database (PostgreSQL? Firebase? Supabase?)
- [ ] Auth provider
- [ ] Hosting platform (Vercel? Netlify? AWS?)
- [ ] Current tournament data source (API or manual entry?)
- [ ] GitHub repo access

**Update this section once Ryan responds.**

## Tournament Data (Not Yet Decided)

Need a data source for live scores, player fields, odds, and cut status. Options being evaluated:
- SportRadar Golf API (comprehensive, expensive ~$500+/mo)
- SportsData.io (more affordable, good coverage)
- The Odds API (good for odds specifically)
- ESPN/PGA Tour unofficial APIs (free but unreliable)
- Manual fallback (organizer enters scores)

## Target Timeline

| Milestone | Target Date |
|-----------|------------|
| Domain + branding | ✅ April 2026 |
| Screen mockups | ✅ April 2026 |
| PRD | ✅ April 2026 |
| Stack confirmed with Ryan | April 2026 (pending) |
| Data provider selected | April 2026 |
| Core build | May 2026 |
| Beta with friend group | PGA Championship, May 15 |
| Iterate | June 2026 |
| Wider launch | US Open, June 18 (stretch) |

## Open Questions

1. Which tournament data API? (cost vs coverage tradeoff)
2. ~~Token economics~~ — RESOLVED: pool-scoped, no persistent wallet, zeros out after settlement
3. Allow multiple entries per user in same pool?
4. Mobile app timing — responsive web first, native later?
5. Legal gut-check on token model

## Long-Term Vision (for context, NOT building now)

- **Phase 2:** On-course games (Nassau, Skins, Wolf, Best Ball) with GHIN sync
- **Phase 3:** Course/club/association tools — tournament management, leagues, derbies
- **Phase 4:** Public pools, social features, season-long fantasy golf

## Files & Artifacts

- **PRD:** HOSEL-PRD.md (comprehensive Phase 1 spec)
- **Screen mockups:** hosel-io-screens.jsx (interactive React prototype with all 4 core screens)
- **Design tokens:** defined in mockup file — COLORS object with full palette

## How to Use This Document

Paste this into:
- A **Claude Project's** custom instructions so all chats in that project have context
- The **start of any new Claude chat** when working on Hosel
- Your **repo's README** or docs folder for contributor onboarding

When starting a new chat, specify which part of Hosel you're working on, e.g.:
- "I'm working on the scoring engine for Hosel — here's the current data model..."
- "Help me research golf data APIs for Hosel"
- "I need to build the leaderboard component for Hosel using Next.js + Supabase"

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

# Hosel.io — Design & Implementation Spec
### For use with Claude Code or any frontend build tool
**Last updated:** April 16, 2026

---

## Table of Contents
1. Product Overview
2. Design System (tokens, colors, typography, spacing, components)
3. App Shell & Navigation
4. Screen Specs (8 screens, mobile-first)
5. Token & Payment Model (pool-scoped, no persistent wallet)
6. Admin Dashboard & Settlement Workflow
7. Data Models
8. Interaction Patterns
9. Responsive Behavior
10. API / Data Requirements

---

## 1. Product Overview

Hosel.io is a golf tournament pick'em pool platform. Users create or join pools tied to PGA Tour events, pick players from tiered groups, and compete for token-based payouts.

**Core screens:** Home (pool list), Create Pool (3-step wizard), Pick Players, Leaderboard, Settlement, Pool History.

**Key constraint:** No real money flows through the app. All amounts use a custom token unit (chip icon). Tokens are **pool-scoped** — they exist only within a single pool and zero out after settlement. There is no persistent wallet or cross-pool balance. The pool admin collects and distributes real money outside the app; Hosel is the scorekeeper and settlement tracker. This must be clearly communicated in the UI.

**Target:** Mobile-first responsive web app. Primary use case is checking the leaderboard on your phone during a tournament.

---

## 2. Design System

### 2.1 Color Palette

```
// Core backgrounds (dark mode)
--bg:             #0a0f0d      // page background
--surface:        #131c17      // elevated sections, nav background
--card:           #1a2820      // cards, inputs, interactive surfaces
--card-hover:     #213429      // card hover state
--border:         #2a3d32      // borders, dividers

// Brand greens
--green:          #2d8a54      // primary action, brand color
--green-light:    #3aaf6a      // secondary highlights, positive indicators
--green-dark:     #1a5c36      // gradient endpoints, dark accents

// Gold / Token
--gold:           #c9a84c      // winners, 1st place, token amounts
--gold-light:     #e0c06a      // gold hover/emphasis
--chip:           #e8b84d      // token icon color
--chip-bg:        #e8b84d22    // token badge background (translucent)

// Text hierarchy
--text:           #e8e4dc      // primary body text
--text-muted:     #8a9490      // secondary text, labels
--text-dim:       #5a6660      // tertiary text, placeholders, disabled
--cream:          #f5f0e8      // headings, high-emphasis text

// Semantic
--red:            #d94f4f      // errors, missed cut, eliminated
--white:          #ffffff      // button text on green backgrounds

// Tier colors (for player selection and badges)
--tier-1:         #c9a84c      // Elite (gold)
--tier-2:         #3aaf6a      // Contenders (green)
--tier-3:         #6cb4ee      // Dark Horses (blue)
--tier-4:         #b490e0      // Sleepers (purple)
--tier-5:         #e08a6c      // Longshots (coral)
```

### 2.2 Typography

**Font stack:** `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif`

Load Inter from Google Fonts (weights: 400, 500, 600, 700, 800).

```
// Type scale
--text-xs:    11px   // badges, tertiary labels, fine print
--text-sm:    12px   // secondary labels, metadata
--text-base:  13px   // body text, nav items, descriptions
--text-md:    14px   // player names, card titles, form inputs
--text-lg:    15px   // taglines, button text
--text-xl:    16px   // section headers, scores
--text-2xl:   22px   // page titles
--text-3xl:   34px   // hero title (home page only)

// Weight usage
400: body text, descriptions
500: nav items, metadata
600: labels, player names, secondary headings
700: section headers, amounts, card titles
800: page titles, hero text, rank numbers, scores
```

### 2.3 Spacing Scale

Use a 4px base grid:
```
--space-1:  4px
--space-2:  6px
--space-3:  8px
--space-4:  10px
--space-5:  12px
--space-6:  14px
--space-7:  16px
--space-8:  18px
--space-9:  20px
--space-10: 24px
--space-12: 28px
--space-14: 32px
--space-16: 40px
--space-20: 48px
```

Page padding: 24px horizontal on mobile, max-width 720px centered on desktop.

### 2.4 Border Radius

```
--radius-sm:  4px    // badges, small elements
--radius-md:  6px    // nav buttons, tabs, inputs
--radius-lg:  8px    // form groups, info boxes
--radius-xl:  10px   // cards, player rows, selection items
--radius-2xl: 12px   // pool cards, major containers
--radius-full: 9999px  // avatars, token badge, pills
```

### 2.5 Shadows & Effects

Minimal shadow use — rely on border + background contrast for depth.

```
--shadow-glow-green: 0 4px 16px rgba(45, 138, 84, 0.25)   // primary CTA
--shadow-glow-gold:  0 4px 20px rgba(201, 168, 76, 0.19)   // gold CTA, winner emphasis
```

Backdrop blur on sticky nav: `backdrop-filter: blur(12px)` with `background: var(--surface)cc` (80% opacity).

### 2.6 Core Components

#### Button — Primary
```
background: linear-gradient(135deg, var(--green), var(--green-dark))
color: var(--white)
padding: 12px 28px
border-radius: var(--radius-lg)
font-size: var(--text-md)
font-weight: 700
box-shadow: var(--shadow-glow-green)
border: none
cursor: pointer
```

#### Button — Secondary
```
background: var(--card)
color: var(--cream)
padding: 12px 28px
border-radius: var(--radius-lg)
font-size: var(--text-md)
font-weight: 600
border: 1px solid var(--border)
cursor: pointer
```

#### Button — Disabled
```
background: var(--card)
color: var(--text-dim)
cursor: default
box-shadow: none
```

#### Button — Gold (launch/confirm actions)
```
background: linear-gradient(135deg, var(--gold), #a88a3a)
color: var(--bg)
font-weight: 700
box-shadow: var(--shadow-glow-gold)
```

#### Card
```
background: var(--card)
border: 1px solid var(--border)
border-radius: var(--radius-2xl)
padding: 18px 20px
```
Active/open card: add 2px green gradient bar at top via `::before` pseudo or absolute div.

#### Input
```
background: var(--card)
border: 1px solid var(--border)
border-radius: var(--radius-lg)
padding: 10px 14px
color: var(--cream)
font-size: var(--text-md)
outline: none
color-scheme: dark  // for native date inputs
```
Focus: `border-color: var(--green)`

#### Badge / Pill
```
display: inline-block
font-size: var(--text-xs)
font-weight: 600
letter-spacing: 0.5px
padding: 3px 8px
border-radius: var(--radius-sm)
text-transform: uppercase
color: {dynamic}
background: {color}18  (8% opacity of the text color)
border: 1px solid {color}30  (19% opacity of the text color)
```

#### Selection Row (player pick, tournament pick, scoring method)
```
// Unselected
background: var(--card)
border: 1.5px solid var(--border)
border-radius: var(--radius-xl)
padding: 12px 16px
cursor: pointer

// Selected
background: {tier-color}14  (8% opacity)
border-color: {tier-color}
```

Radio circle inside selection row:
```
width: 20px, height: 20px, border-radius: 50%
// Unselected: border 2px solid var(--text-dim), transparent fill
// Selected: border 2px solid {tier-color}, fill {tier-color}, white checkmark "✓"
```

#### Tab Bar (round selector)
```
container: background var(--surface), border-radius var(--radius-lg), padding 3px
tab: flex 1, padding 8px 0, border-radius var(--radius-md), font-size var(--text-base), font-weight 600
active tab: background var(--card), color var(--cream)
inactive tab: background transparent, color var(--text-muted)
```

---

## 3. App Shell & Navigation

### Top Nav Bar (sticky)
```
Layout: flex, space-between, align-center
Padding: 14px 24px
Background: var(--surface) at 80% opacity + backdrop-filter blur(12px)
Border-bottom: 1px solid var(--border)
Position: sticky, top: 0, z-index: 10

Left: Logo + wordmark (clickable → home)
Center: Nav buttons [Pools, Board, Picks]
Right: User avatar (no persistent wallet — token info is shown per-pool)
```

#### Logo Mark (inline SVG)
Stylized golf club showing the hosel junction:
- Club head: rounded rectangle, fill var(--green)
- Hosel junction: small circle, fill var(--green-light)
- Shaft: angled line, stroke var(--cream), 2.2px width, round linecap

Viewbox: 0 0 32 32. Typical render size: 22×22px in nav, 48×48px on home hero.

#### Wordmark
Next to logo: "hosel" in font-weight 700, size 17px, color var(--cream). Optional ".io" suffix in var(--text-dim), font-weight 400, size 12px.

When inside a pool context, the wordmark changes to the pool name (e.g., "PGA Championship").

#### User Avatar
```
width: 30px, height: 30px, border-radius: 50%
background: linear-gradient(135deg, var(--green), var(--green-dark))
text: user initials, font-size 12px, font-weight 700, color white, centered
```

---

## 4. Screen Specifications

### 4.1 HOME — Pool List

**URL:** `/` or `/pools`

**Layout:**
```
[Nav Bar]
[Hero Section]
[Your Pools — card list]
[How It Works — 4-column grid]
```

#### Hero Section
```
padding: 48px 24px 40px
text-align: center
background: linear-gradient(180deg, var(--surface) 0%, var(--bg) 100%)

[Logo mark at 48px]
[Title: "hosel" + ".io" — see wordmark spec but at 34px/hero size]
[Tagline: "Pick your players. Follow the action. Claim the pot." — text-lg, text-muted]
[Token explainer: "All pools use [chip icon] tokens — settle up with your crew however you like" — text-sm, text-dim]
[Two buttons: "Create a Pool" (primary), "Join with Code" (secondary)]
```

#### Pool Cards
One card per pool the user belongs to. Sorted: open → upcoming → complete.

```
[Card component]
  [Top bar: 2px green gradient — only if status is "open"]
  [Row: Pool name (text-xl, cream, weight 700) ... StatusDot (right aligned)]
  [Row: Course · Date range — text-base, text-muted]
  [Row: "X/Y entries" | "Buy-in: [chip] 25" | "Pot: [chip] 450"]
```

**StatusDot component:**
```
[7px circle + label text]
Open: color var(--green-light), circle has box-shadow glow, label "Accepting Entries"
Upcoming: color var(--gold), no glow, label "Coming Soon"
Complete: color var(--text-dim), no glow, label "Complete"
```

Tapping an open pool → Pick Players screen. Tapping a complete pool → Leaderboard.

#### How It Works
4-column grid (stacks to 2×2 on narrow screens):
1. **Stake** (chip icon, 24px) — "Everyone puts in tokens to join the pool"
2. **Pick** (🏌️) — "Choose 1 player from each of 5 tiers"
3. **Track** (📊) — "Live scoring auto-updates your lineup"
4. **Win** (🏆) — "Top 3 each day & overall winner take tokens"

Each item: surface background, border, border-radius-xl, padding 14px, centered text.

---

### 4.2 CREATE POOL — 3-Step Wizard

**URL:** `/create`

**Layout:**
```
[Nav Bar]
[Page title: "Create a Pool" — text-2xl, cream]
[Subtitle: "Set up your tournament pool in a few steps" — text-base, text-muted]
[Step indicator: 3 segments with labels]
[Step content — changes per step]
```

#### Step Indicator
```
3 flex segments, gap 8px
Each: [3px tall bar, border-radius 2px] + [label below, text-xs, weight 600]
Completed/active steps: bar is var(--green), label is var(--cream)
Future steps: bar is var(--text-dim) at 25%, label is var(--text-dim)
```

#### Step 1: Tournament
- **Tournament selector:** List of upcoming tournaments as selection rows. Each shows tournament name (text-md, weight 600) and course + dates (text-sm, text-muted). One selected at a time.
- **Pool name:** Text input, default value "[Tournament] Pool"
- **Buy-in:** Number input with chip icon in label. Default 25.
- **Max entries:** Number input. Default 30.
- **Continue button:** Primary button → "Continue → Rules"

#### Step 2: Rules
- **Number of tiers:** 4 buttons in a row [3, 4, 5, 6]. Default 5 selected. Uses selection styling.
- **Scoring method:** 3 selection rows:
  - "Best 3 of 5" — "Low 3 player scores each day. Classic format." (default selected)
  - "All 5 scores" — "Every pick counts. Higher variance."
  - "Best 4 of 5" — "Drop your worst. Balanced risk."
- **Cut rule:** Info box showing "Need 3+ players to make the cut for R3/R4 & overall eligibility"
- **Back button** (secondary, flex 1) + **Continue button** (primary, flex 2)

#### Step 3: Payouts
- **Payout structure table:** Card with 5 rows:
  - Rounds 1–4: "20% of pot · 50/35/15 split" each
  - Overall Winner row: styled in gold with chip icon, separated by gold-tinted top border
- **Token disclaimer box:**
  ```
  background: var(--surface)
  border: 1px solid var(--chip) at 15%
  [chip icon] "Tokens are for tracking only." (bold, chip color) + "Pool members settle up among themselves — Hosel doesn't handle real money." (text-muted)
  ```
- **Entry deadline:** Date input (default: day before tournament Round 1)
- **Back button** + **"Launch Pool & Copy Invite Link"** (gold button)

On submit: create pool, generate invite code + URL, copy to clipboard, redirect to home.

---

### 4.3 PICK PLAYERS — Tier Selection

**URL:** `/pool/:id/pick`

**Layout:**
```
[Nav Bar — pool name as wordmark]
[Header: title + pick count badge]
[Subtitle: tournament info + entry cost + scoring method]
[Progress bar: 5 color segments]
[Tier 1 section]
[Tier 2 section]
...
[Tier 5 section]
[Tiebreaker card]
[Submit button]
```

#### Header
```
"Pick Your Players" — text-2xl, cream, weight 800
Right side: Badge showing "X/5" (gold color if incomplete, green-light if 5/5)
Subtitle: "PGA Championship · Aronimink GC · Choose 1 from each tier"
Second line: "Entry: [chip] 25 · Best 3 of 5 scores each day" — text-sm, text-dim
```

#### Progress Bar
```
5 flex segments, gap 4px, height 3px, border-radius 2px
Each segment: fills with its tier color when that tier has a pick, otherwise var(--text-dim) at 25%
transition: background 0.3s
```

#### Tier Section
```
Label row: "TIER X" (tier color, text-xs, weight 700, letter-spacing 1px, uppercase) — "Label" (text-sm, text-muted)
Player list: vertical stack, gap 6px
```

Each player is a **Selection Row** (see component spec above):
```
Left side: [Radio circle] [Player name (text-md, weight 600) + "World #X" (text-xs, text-muted)]
Right side: Odds in monospace (text-sm, text-muted) e.g. "+1200"
```

Selection uses the tier's color for border, background tint, and radio fill.

#### Tiebreaker Card
```
background: var(--surface), border, border-radius-2xl, padding 20px
Title: "Tiebreaker" — text-md, weight 700, cream
Description: "Predict the lowest round score by any player in the field" — text-sm, text-muted
4-column grid: [R1] [R2] [R3] [R4]
Each: label (text-xs, text-muted) + number input (centered, monospace, placeholder "-7")
```

#### Submit Button
Full-width at bottom:
```
If picks < 5: disabled state — "Select X more player(s)"
If picks = 5: primary green gradient — "Lock In Picks · [chip icon white] 25"
  chip icon renders white to match button text
```

---

### 4.4 LEADERBOARD — Live Standings

**URL:** `/pool/:id/leaderboard`

**Layout:**
```
[Nav Bar — pool name as wordmark]
[Stats Bar]
[Payout Banner]
[Round Tabs]
[Leaderboard Table]
[Scoring Rules Note]
```

#### Stats Bar
```
Sticky below nav (or part of nav)
background: var(--surface), border-bottom
flex, centered, gap 28px, padding 16px 24px

Items (centered vertically):
- "Entries" → "18" (cream, weight 700)
- "Pot" → [chip] 450 (TokenAmount component)
- "Leader" → "Mike T." (gold, weight 700)
- "Round 3 of 4" → "Live" (green-light, weight 700) + pulsing green dot
```

Pulsing dot animation:
```css
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
animation: pulse 2s infinite
```

#### Payout Banner
```
background: linear-gradient(135deg, var(--card) 0%, var(--green-dark) at 30% opacity 100%)
border, border-radius-xl, padding 14px 18px
flex, space-around, centered

Columns:
- 1st (50%): [label text-xs text-muted] [TokenAmount in gold, size 13] ["per round" text-xs text-dim]
- 2nd (35%): [label] [TokenAmount in chip color] ["per round"]
- 3rd (15%): [label] [TokenAmount in chip color] ["per round"]
- Overall: [label] [TokenAmount in gold] ["total winner"]
```

#### Round Tabs
Tab bar component (see spec above). Tabs: R1, R2, R3, R4, Total.

Active tab determines which score column is highlighted/primary, though all round columns remain visible.

#### Leaderboard Table
```
Grid columns: 32px 1fr 52px 52px 52px 64px
              [rank] [player] [R1] [R2] [R3] [Total]

Header row: text-xs, text-dim, weight 600, uppercase, letter-spacing 0.5px
```

Each participant row:
```
padding: 12px
border-radius: var(--radius-lg)
alternating: even rows get var(--surface) background

Rank column:
  1st: gold, weight 800
  2nd-3rd: green-light, weight 800
  4th+: text-muted, weight 800

Player column:
  Name: text-md, weight 600, cream
  Picks: text-xs (10px), text-dim, single line truncated with ellipsis
  Separator between picks: " · "
  1st place row: small chip icon (11px, gold) next to name

Score columns: monospace font, text-base, weight 500, var(--text)
  Unplayed rounds: "—" in text-dim
  
Total column: text-xl (15px), weight 800
  1st: gold
  2nd-3rd+: green-light

1st place row gets special treatment:
  background: var(--gold) at 3% opacity
  border: 1px solid var(--gold) at 15%
```

If R4 is incomplete, show R4 column values as in-progress.

When a round is final, consider showing payout labels inline (stretch feature).

#### Scoring Rules Note
```
Info box at bottom:
background: var(--surface), border, border-radius-lg, padding 12px 16px
"Scoring:" (cream, bold) + rules text (text-sm, text-muted)
"Best 3 of 5 player scores each day. Need 3+ players to make the cut for R3/R4 & overall eligibility. Tiebreaker = sum of predicted lowest daily scores."
```

---

### 4.5 SETTLEMENT — Post-Tournament (Admin View)

**URL:** `/pool/:id/settlement`

**Appears after:** Tournament is complete and final scores are locked. The admin sees the full management view; participants see a read-only summary.

**Who sees what:**
- **Admin** sees: payout breakdown, distribution checklist (mark each payout as distributed), pool status (open → settled)
- **Participants** see: payout breakdown (read-only), their own net result, status of whether admin has marked them as paid

**Layout (Admin):**
```
[Nav Bar — pool name]
[Winner Banner]
[Pool Summary — total pot, entries, status]
[Payout Breakdown — by round + overall]
[Distribution Checklist — admin marks each payout as sent]
[Close Pool button]
```

#### Winner Banner
```
Full-width card, centered, gold gradient border
[Trophy emoji or icon]
"[Winner Name] wins the pool!" — text-2xl, gold, weight 800
"Total winnings: [chip] X" — TokenAmount in gold
```

#### Pool Summary
```
Card with key stats:
- Total pot: [chip] X (buy-in × entries)
- Entries: X
- Status: "Awaiting Distribution" (amber) or "Settled" (green)
```

#### Payout Breakdown
Table or card stack showing each round result:
```
Round 1:
  1st: [Name] — [chip] 45
  2nd: [Name] — [chip] 32
  3rd: [Name] — [chip] 14

...repeat for Rounds 2-4...

Overall:
  Winner: [Name] — [chip] 90
```

#### Distribution Checklist (Admin Only)
This is the admin's tool for tracking who they've paid out in the real world.

```
Header: "Distribute Payouts" — text-xl, cream
Subheader: "Mark each payout as distributed. Tokens clear when all are settled." — text-sm, text-muted

Each row = one payout owed:
  [Player name] — [reason: "R1 1st Place"] — [chip] amount
  Right side: [Mark Paid] button (small, secondary)
  
When marked paid: row gets green-light border, checkmark, "Paid" label
Progress indicator at top: "4 of 8 payouts distributed"
```

When all payouts are marked as distributed, show:
```
[All Settled banner — green, celebratory]
"Pool is fully settled! 🎉"
[Close Pool] button — moves pool to history, zeros everything out
```

#### Participant View (non-admin)
```
Same payout breakdown (read-only)
Their net result: "You won [chip] 45" or "Better luck next time"
Each payout they're owed shows status: "Pending" (amber) or "Paid ✓" (green)
```

#### Disclaimer (bottom)
```
Same token disclaimer box as in Create Pool:
"Tokens are for tracking only. The pool organizer handles all payments outside of Hosel."
```

---

### 4.6 ADMIN DASHBOARD — Pool Management

**URL:** `/pool/:id/manage`

**Only visible to:** The user who created the pool (the admin/organizer).

**Accessible from:** A "Manage Pool" button on the pool card (home screen) or a gear icon in the pool nav.

**Layout:**
```
[Nav Bar — pool name + "Admin" badge]
[Pool Status Card]
[Entry Management — who joined, buy-in status]
[Pool Settings — edit before deadline]
[Danger Zone — cancel pool]
```

#### Pool Status Card
```
background: var(--card), border, border-radius-2xl
Shows:
- Pool name + tournament
- Status: Draft → Open → Locked → Live → Complete → Settled
- Entry count: X / max
- Total pot: [chip] buy-in × entries
- Deadline countdown or "Picks locked"
- Invite code + "Copy Link" button
```

#### Entry Management
This is where the admin's payment confirmation toggle matters.

```
Header: "Entries" — with toggle:
  [☑ Require buy-in confirmation] — when ON, admin must confirm each player's buy-in
  When OFF, players auto-confirm on join (honor system)

Player list — each row:
  [Player avatar/initials] [Display name]
  [Picks status: "Picks submitted" (green) or "No picks yet" (amber)]
  [Buy-in status — if confirmation required]:
    "Awaiting payment" (amber dot) → admin taps → "Confirmed ✓" (green dot)
    If not confirmed by deadline, picks are locked out

If confirmation toggle is OFF:
  Buy-in status just shows "Agreed ✓" for everyone who joined
```

Note: When buy-in confirmation is required and the admin hasn't confirmed a player's payment, that player can still browse tiers and draft picks, but they see a banner: "Your picks will be locked in once the organizer confirms your buy-in." Their picks are saved but not active until confirmed.

#### Pool Settings (editable before first entry)
```
- Pool name
- Buy-in amount (tokens)
- Max entries
- Number of tiers / scoring method
- Entry deadline
- Payout structure

Note: Once the first player has joined, some settings lock (buy-in, tier count, scoring method).
Changes to deadline and max entries remain editable.
```

#### Danger Zone
```
background: var(--red) at 5%, border: 1px solid var(--red) at 20%
"Cancel Pool" — confirmation modal required
"This will remove the pool and notify all participants."
Only available before tournament starts.
```

---

### 4.7 POOL HISTORY

**URL:** `/history` or accessible from home screen

**Layout:** List of completed pools (reuses pool card component with "Complete" status). Tapping a card opens the settlement/final leaderboard view for that pool.

Each history card shows: tournament name, date, winner, your finishing rank, and your net token result for that pool.

---

### 4.8 ACCOUNT

**URL:** `/account`

**Layout:**
```
[Nav Bar]
[Profile section — avatar, name, email]
[Pool Stats — lifetime summary]
[Settings links]
[Log out]
```

#### Profile Section
Avatar (large, 48px) + display name + email. Edit button.

#### Pool Stats
Lifetime aggregate stats (calculated across all completed pools):
```
Pools played: X
Podium finishes: X (times finishing 1st-3rd in any round or overall)
Best finish: 1st (in [Tournament Name])
```

Note: There is NO persistent token balance or lifetime winnings counter. Each pool is self-contained. Stats are purely for fun/bragging rights.

---

## 5. Token & Payment Model

### Core Principle
Tokens are **pool-scoped, not user-scoped**. There is no persistent wallet, no global balance, no tokens carrying over between pools. Each pool is a self-contained ledger that zeros out after settlement.

### How It Works

1. **Admin creates pool** and sets the buy-in (e.g., 25 tokens). Tokens represent whatever real-world value the group agrees on — $25, a round of drinks, bragging rights. Hosel doesn't know or care what they map to.

2. **Players join and agree to the buy-in.** This is an acknowledgment: "I owe the pool organizer this amount." The admin can optionally require manual confirmation that the player has actually paid before their picks go live (toggle in Admin Dashboard).

3. **Tournament plays out.** The app calculates standings and payouts automatically based on the pool's rules and payout structure.

4. **Admin distributes payouts.** After the tournament, the admin sees a Distribution Checklist showing every payout owed. As they pay each person in the real world (Venmo, cash, etc.), they mark it as distributed in the app.

5. **Pool closes.** Once all payouts are marked as distributed, the pool moves to history. All token amounts are purely historical records — nothing carries forward.

### What This Means for the UI
- **No wallet badge in nav.** There is no global token balance to show.
- **Pool cards show buy-in and pot.** These are informational — "this pool has a 25-token buy-in and 450 tokens in the pot."
- **Entry confirmation shows obligation.** When a player joins, the confirmation says "You're agreeing to a 25-token buy-in for this pool. Settle up with your organizer."
- **Leaderboard shows token payouts.** Payout positions are labeled with token amounts so everyone can see stakes.
- **Settlement is admin-driven.** The admin marks payouts as distributed; players see status (pending/paid).
- **History shows per-pool results.** Each past pool shows your rank and token result for that pool only.

### Token Icon (SVG Spec)
```svg
<svg viewBox="0 0 20 20" fill="none">
  <circle cx="10" cy="10" r="9" stroke="{color}" stroke-width="1.8" fill="{color}18" />
  <circle cx="10" cy="10" r="5.5" stroke="{color}" stroke-width="1.2" stroke-dasharray="2.5 2" />
  <circle cx="10" cy="10" r="2" fill="{color}" />
</svg>
```
Default color: var(--chip) / #e8b84d. Override to white on green buttons, gold for winners.

### TokenAmount Component
Renders inline: `[ChipIcon size] [amount text]`
```
display: inline-flex, align-items: center, gap: 3px
amount text: font-weight 700, color {color}, font-variant-numeric: tabular-nums
```

### Disclaimers (shown in multiple places)
- **Create Pool (Step 3):** "Tokens are for tracking only. The pool organizer collects and distributes payments outside of Hosel."
- **Join Pool confirmation:** "By joining, you agree to a [X]-token buy-in. Settle up with your organizer directly."
- **Settlement footer:** "Tokens are for tracking only. The pool organizer handles all payments outside of Hosel."

---

## 6. Admin Dashboard & Settlement Workflow

### Admin Lifecycle

The admin (pool creator) manages 3 phases:

#### Phase A: Collection (before tournament)
```
Pool status: OPEN
Admin sees: Entry Management list
  - Each player row shows: name, pick status, buy-in status
  - If "require confirmation" is ON: admin taps to confirm each player's buy-in
  - If "require confirmation" is OFF: all joins are auto-confirmed
  - Admin can see who hasn't submitted picks yet (send reminder — stretch)
  - Admin can copy invite link / code at any time
```

#### Phase B: Tournament (during play)
```
Pool status: LOCKED → LIVE
Admin sees: Same leaderboard as everyone else
  - No special admin actions during play
  - Manage Pool button still accessible for reference
```

#### Phase C: Distribution (after tournament)
```
Pool status: COMPLETE → SETTLING → SETTLED
Admin sees: Settlement screen with Distribution Checklist

Distribution Checklist:
  The app calculates every individual payout owed:
  - "Pay [Player Name] [chip] X for [R1 1st Place]"
  - "Pay [Player Name] [chip] X for [Overall Winner]"
  
  Admin marks each as "Paid" as they distribute in the real world.
  
  Progress bar at top: "4 of 8 payouts distributed"
  
  When all marked paid:
  - Pool status changes to SETTLED
  - Pool moves to history
  - Celebratory state: "All settled! 🎉"
  
  Note: Players who didn't win anything need no payout row.
  Only positive payouts are tracked (they already paid in via buy-in).
```

### Permissions Summary
```
Action                           | Admin | Player
---------------------------------|-------|-------
Create pool                      | ✓     | —
Edit pool settings               | ✓     | —
Confirm player buy-ins           | ✓     | —
Cancel pool                      | ✓     | —
Submit/edit picks                | ✓     | ✓
View leaderboard                 | ✓     | ✓
View payout breakdown            | ✓     | ✓
Mark payouts as distributed      | ✓     | —
See own payout status            | ✓     | ✓
Close/settle pool                | ✓     | —
```

---

## 7. Data Models

### User
```
id: string (uuid)
email: string
display_name: string
avatar_initials: string (auto-generated from display_name)
created_at: timestamp
```
Note: No token_balance field. Tokens are pool-scoped, not user-scoped.

### Pool
```
id: string (uuid)
name: string
tournament_id: string (references Tournament)
organizer_id: string (references User — the admin)
buy_in: integer (token amount per entry)
max_entries: integer
scoring_method: enum ["best_3_of_5", "best_4_of_5", "all_5"]
num_tiers: integer (3-6)
cut_rule_minimum: integer (default 3 — min players making cut for weekend eligibility)
payout_structure: json (default: {round: {first: 50, second: 35, third: 15}, overall: 100})
entry_deadline: timestamp
invite_code: string (6 chars, alphanumeric, unique)
require_buyin_confirmation: boolean (default true — admin confirms each player's payment)
status: enum ["draft", "open", "locked", "live", "complete", "settling", "settled"]
total_pot: integer (computed: buy_in × confirmed entries)
created_at: timestamp
```

### Pool Entry (a user's participation in a pool)
```
id: string (uuid)
pool_id: string (references Pool)
user_id: string (references User)
picks: json (map of tier_number → player_id, null until submitted)
tiebreaker: json ({r1: integer, r2: integer, r3: integer, r4: integer})
buyin_status: enum ["pending", "confirmed"] 
  — if pool.require_buyin_confirmation is false, auto-set to "confirmed" on join
  — if true, stays "pending" until admin confirms
picks_locked: boolean (computed — true once deadline passes AND buyin_status is "confirmed")
is_eligible_weekend: boolean (computed — true if 3+ picks made the cut)
created_at: timestamp
updated_at: timestamp
```

### Tournament
```
id: string (uuid)
external_id: string (from data provider)
name: string
course: string
start_date: date
end_date: date
status: enum ["upcoming", "in_progress", "complete"]
current_round: integer (1-4, null if not started)
cut_line: integer (null until cut is made after R2)
```

### Tournament Player
```
id: string (uuid)
tournament_id: string (references Tournament)
external_player_id: string (from data provider)
name: string
world_ranking: integer
odds: string (e.g., "+1200")
tier: integer (1-6, assigned by system or organizer)
status: enum ["active", "cut", "withdrawn", "disqualified"]
r1_score: integer (null if not played)
r2_score: integer
r3_score: integer
r4_score: integer
total_score: integer (computed)
```

### Pool Result (calculated after tournament)
```
id: string (uuid)
pool_id: string (references Pool)
entry_id: string (references Pool Entry)
user_id: string (references User)
r1_score: integer (user's composite score for round — best X of Y)
r2_score: integer
r3_score: integer (null if ineligible)
r4_score: integer (null if ineligible)
total_score: integer
tiebreaker_diff: integer (absolute diff from actual lowest scores)
final_rank: integer
```

### Pool Payout (individual payout line items — admin tracks distribution)
```
id: string (uuid)
pool_id: string (references Pool)
user_id: string (references User — the recipient)
category: enum ["round_1", "round_2", "round_3", "round_4", "overall"]
placement: enum ["first", "second", "third", "winner"]
token_amount: integer
is_distributed: boolean (default false — admin marks true when paid out IRL)
distributed_at: timestamp (null until distributed)
```
Note: Only positive payouts are tracked. Players who didn't win anything have no rows here — they already paid their buy-in to the admin outside the app.

---

## 8. Interaction Patterns

### Transitions
- All interactive elements: `transition: all 0.15s ease`
- Progress bar fills: `transition: background 0.3s ease`
- Page transitions: instant (SPA routing), no animated transitions needed for v1

### Selection Behavior
- **Player picks:** Radio-style per tier — selecting a new player in the same tier deselects the previous. Tapping a selected player deselects it.
- **Tournament/scoring selection:** Same radio-style, one active at a time.
- **Tier count buttons:** Single select from [3, 4, 5, 6].

### Form Behavior
- Inputs auto-focus on mobile where helpful (e.g., pool name)
- Number inputs: no spin buttons on mobile (use inputmode="numeric")
- Date inputs: use native date picker (color-scheme: dark)
- All inputs: border goes green on focus

### Loading States
- Leaderboard: show skeleton rows (var(--card) rectangles with subtle shimmer)
- Pool list: skeleton cards
- Score updates: fade in new values

### Empty States
- No pools: "You're not in any pools yet. Create one or join with a code."
- No picks: The pick screen itself serves as the empty state
- No scores yet: Leaderboard shows picks with "—" for all scores

### Error States
- Failed to load: "Couldn't load the leaderboard. Pull to refresh."
- Deadline passed: Pick screen shows locked state with summary of submitted picks
- Insufficient tokens: Submit button disabled, tooltip "Not enough tokens"

---

## 9. Responsive Behavior

### Breakpoints
```
Mobile (default): < 640px — single column, full-width cards
Tablet: 640px–1024px — content max-width 720px, centered
Desktop: > 1024px — max-width 720px centered with dark bg sides
```

The app shell renders inside a max-width 480px container on desktop with left/right borders (1px solid var(--border)) to simulate a phone-width experience. This is intentional — the primary UX is mobile.

### Mobile-Specific Adjustments
- How It Works grid: 2×2 instead of 4-column
- Leaderboard: player picks row truncates with ellipsis
- Stats bar: wraps to 2×2 grid if needed
- Payout banner: wraps, gap 8px
- Nav center buttons: shorter labels — "Pools", "Board", "Picks"

---

## 10. API / Data Requirements

### External: Tournament Data
Need a data provider API that gives us:
- Upcoming tournament schedule + field
- Player rankings and odds
- Live scores per round (ideally updating every few minutes during play)
- Cut line and player status (active, cut, WD, DQ)

**Top candidates to evaluate:**
1. SportsData.io Golf API — affordable tiers, good coverage
2. SportRadar Golf API — comprehensive but expensive
3. ESPN hidden APIs — free but no SLA, may break

For MVP/beta: can fall back to manual entry by organizer if API isn't ready.

### Internal API Endpoints Needed

```
Auth:
  POST /auth/signup
  POST /auth/login
  GET  /auth/me

Pools:
  POST   /pools                  (create pool)
  GET    /pools                  (list user's pools — both as admin and participant)
  GET    /pools/:id              (pool details + settings)
  POST   /pools/:id/join         (join with invite code)
  GET    /pools/:id/entries       (all entries in pool)

Pool Admin:
  PUT    /pools/:id              (update pool settings — admin only, pre-first-entry for most fields)
  DELETE /pools/:id              (cancel pool — admin only, before tournament starts)
  POST   /pools/:id/entries/:entry_id/confirm  (confirm a player's buy-in — admin only)
  GET    /pools/:id/manage       (admin dashboard data — entries, buy-in statuses, pool status)

Picks:
  POST   /pools/:id/picks        (submit picks — requires confirmed buy-in if toggle is on)
  PUT    /pools/:id/picks        (edit picks before deadline)
  GET    /pools/:id/picks/mine   (get my picks)

Leaderboard:
  GET    /pools/:id/leaderboard  (computed standings + scores)
  GET    /pools/:id/leaderboard/round/:round  (filtered by round)

Settlement:
  GET    /pools/:id/settlement   (payout breakdown + distribution status)
  POST   /pools/:id/payouts/:payout_id/distribute  (mark payout as distributed — admin only)
  POST   /pools/:id/settle       (close pool, move to history — admin only, all payouts must be distributed)

Tournaments:
  GET    /tournaments            (upcoming tournaments)
  GET    /tournaments/:id        (details + field + tiers)
  GET    /tournaments/:id/scores (live scores — or via websocket)

User:
  GET    /users/me               (profile + lifetime stats)
  PUT    /users/me               (update display name, etc.)
```

### Real-time
Leaderboard should update without manual refresh during live tournament play. Options:
- WebSocket connection for live score pushes
- Supabase Realtime subscriptions
- Polling every 60 seconds (simplest, fine for v1)
```

---
