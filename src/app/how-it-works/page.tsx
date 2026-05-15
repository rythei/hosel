import { NavBar } from "@/components/NavBar";
import Link from "next/link";

const sections = [
  {
    icon: "🏆",
    title: "What is Hosel?",
    content: [
      "Hosel is a pick'em pool platform built around PGA Tour events. You and your crew each pick one golfer from a set of tiers, and whoever has the best lineup at the end of the tournament wins.",
      "It's the same format you'd run on a spreadsheet — just faster to set up, automatic scoring, and no manual math.",
    ],
  },
  {
    icon: "🪙",
    title: "How tokens work",
    content: [
      "Tokens are how Hosel tracks the pot. When a pool is created, the organizer sets a buy-in amount. Everyone who joins agrees to that buy-in.",
      "Tokens are not real money and Hosel never handles any payments. Think of them as a scoreboard for your group's real-world bet — you settle up with cash, Venmo, or a round of drinks after.",
      "Every pool is its own closed ledger. Tokens don't carry over between pools.",
    ],
  },
  {
    icon: "🎯",
    title: "Creating a pool",
    content: [
      'Hit "Create a Pool" from the home screen. You\'ll pick a tournament, set a buy-in amount, and choose a scoring method (Best 3 of 5, Best 4 of 5, or All 5 players count).',
      "Once the pool is created, you'll get an invite code and a shareable link. Send it to your group — anyone with the code can join.",
      "As the organizer you can lock picks before the tournament starts, confirm buy-ins, and manage the pool from the admin dashboard.",
    ],
  },
  {
    icon: "🏌️",
    title: "Picking your players",
    content: [
      "Each pool has tiers set by the organizer. Tier 1 is the top-ranked favorites, the last tier is the longshots. You pick exactly one player from each tier.",
      "Your picks are private until the organizer locks the pool. After that, no changes can be made.",
      "If you haven't submitted picks before the deadline, you'll be locked out — so don't wait.",
    ],
  },
  {
    icon: "📊",
    title: "Scoring",
    content: [
      "Scores update automatically from ESPN throughout the tournament. You don't need to do anything — just check the leaderboard.",
      'Your team score is based on the scoring method the organizer chose. "Best 3 of 5" means your top 3 performers count, drops your 2 worst. "All 5" means every player counts.',
      "Lower is better — golf scoring. The player with the lowest combined score wins the pool.",
      "There are daily prizes too: the top 3 lineups each round win a share of the round pot, and the overall winner takes the rest.",
    ],
  },
  {
    icon: "💰",
    title: "Payouts & settlement",
    content: [
      "After the tournament, the organizer goes to the Settlement page to review who won what. Payouts are calculated automatically based on the scoring results.",
      "The organizer marks each payout as distributed once they've paid the winner. This is the honor system — Hosel just tracks it.",
      "Once everything is settled, the organizer can archive the pool to clear it from the home screen.",
    ],
  },
  {
    icon: "🔗",
    title: "Joining a pool",
    content: [
      "If someone sends you an invite link, tap it and you'll land directly in the join flow.",
      'If you have a 6-character invite code, hit "Join with Code" on the home screen and enter it.',
      "You'll need an account to join. Sign up takes about 30 seconds.",
    ],
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <NavBar />
      <div style={{ padding: "32px 24px 64px" }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: "var(--text-3xl)", fontWeight: 800, color: "var(--cream)", marginBottom: 8 }}>
            How it works
          </h1>
          <p style={{ fontSize: "var(--text-lg)", color: "var(--text-muted)" }}>
            Everything you need to know to run or join a Hosel pool.
          </p>
        </div>

        {/* Sections */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {sections.map((section) => (
            <div key={section.title} className="card">
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 22 }}>{section.icon}</span>
                <h2 style={{ fontSize: "var(--text-xl)", fontWeight: 700, color: "var(--cream)" }}>
                  {section.title}
                </h2>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {section.content.map((para, i) => (
                  <p key={i} style={{ fontSize: "var(--text-base)", color: "var(--text-muted)", lineHeight: 1.6 }}>
                    {para}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div
          className="card"
          style={{
            marginTop: 24,
            textAlign: "center",
            background: "linear-gradient(135deg, var(--green-dark), var(--green))",
            border: "none",
          }}
        >
          <p style={{ fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--cream)", marginBottom: 6 }}>
            Ready to play?
          </p>
          <p style={{ fontSize: "var(--text-base)", color: "var(--text-muted)", marginBottom: 16 }}>
            Create a pool for your group or join one with an invite code.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <Link href="/create" className="btn-primary">Create a Pool</Link>
            <Link href="/join" className="btn-secondary">Join with Code</Link>
          </div>
        </div>

      </div>
    </>
  );
}
