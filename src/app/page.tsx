import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { HoselLogo, TokenAmount } from "@/components/HoselLogo";
import Link from "next/link";
import type { Pool, User } from "@/types";

type PoolStatus = Pool["status"];

function StatusDot({ status }: { status: PoolStatus }) {
  const config: Record<PoolStatus, { color: string; label: string; glow: boolean }> = {
    open: { color: "var(--green-light)", label: "Accepting Entries", glow: true },
    draft: { color: "var(--text-dim)", label: "Draft", glow: false },
    locked: { color: "var(--gold)", label: "Picks Locked", glow: false },
    live: { color: "var(--green-light)", label: "Live", glow: true },
    complete: { color: "var(--text-dim)", label: "Complete", glow: false },
    settling: { color: "var(--gold)", label: "Settling", glow: false },
    settled: { color: "var(--text-dim)", label: "Settled", glow: false },
    archived: { color: "var(--text-dim)", label: "Archived", glow: false },
  };

  const c = config[status];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: c.color,
          display: "inline-block",
          boxShadow: c.glow ? `0 0 6px ${c.color}` : "none",
        }}
      />
      <span style={{ fontSize: "var(--text-xs)", color: c.color, fontWeight: 600 }}>
        {c.label}
      </span>
    </span>
  );
}

function PoolCard({ pool }: { pool: Pool & { entry_count: number; tournament: { name: string; course: string; start_date: string; end_date: string } } }) {
  const isActive = pool.status === "open" || pool.status === "live";
  const href =
    pool.status === "open" ? `/pool/${pool.id}/pick` :
    pool.status === "complete" || pool.status === "settling" || pool.status === "settled" ? `/pool/${pool.id}/settlement` :
    `/pool/${pool.id}/leaderboard`;

  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <div
        className="card pool-card"
        style={{
          position: "relative",
          overflow: "hidden",
          cursor: "pointer",
          transition: "background 0.15s ease",
        }}
      >
        {/* Green top bar for active pools */}
        {isActive && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 2,
              background: "linear-gradient(90deg, var(--green), var(--green-light))",
            }}
          />
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
          <span style={{ fontSize: "var(--text-xl)", fontWeight: 700, color: "var(--cream)" }}>
            {pool.name}
          </span>
          <StatusDot status={pool.status} />
        </div>

        <p style={{ fontSize: "var(--text-base)", color: "var(--text-muted)", marginBottom: 12 }}>
          {pool.tournament.course} · {new Date(pool.tournament.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}–{new Date(pool.tournament.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </p>

        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
            {pool.entry_count}/{pool.max_entries} entries
          </span>
          <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
            Buy-in: <TokenAmount amount={pool.buy_in} size={12} />
          </span>
          <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
            Pot: <TokenAmount amount={pool.buy_in * pool.entry_count} size={12} />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) redirect("/auth/login");

  const { data: userProfile } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .single<User>();

  // Fetch pools the user is in (as organizer or participant)
  const { data: myEntries } = await supabase
    .from("pool_entries")
    .select("pool_id")
    .eq("user_id", authUser.id);

  const entryPoolIds = myEntries?.map((e) => e.pool_id) ?? [];
  const poolIds = Array.from(new Set([...entryPoolIds]));

  const { data: organizedPools } = await supabase
    .from("pools")
    .select("*, tournament:tournaments(name, course, start_date, end_date)")
    .eq("organizer_id", authUser.id);

  const { data: participantPools } = poolIds.length > 0
    ? await supabase
        .from("pools")
        .select("*, tournament:tournaments(name, course, start_date, end_date)")
        .in("id", poolIds)
        .neq("organizer_id", authUser.id)
    : { data: [] };

  const allPools = [
    ...(organizedPools ?? []),
    ...(participantPools ?? []),
  ];

  // Get entry counts per pool
  const { data: entryCounts } = allPools.length > 0
    ? await supabase
        .from("pool_entries")
        .select("pool_id")
        .in("pool_id", allPools.map((p) => p.id))
        .eq("buyin_status", "confirmed")
    : { data: [] };

  const countMap = (entryCounts ?? []).reduce<Record<string, number>>((acc, e) => {
    acc[e.pool_id] = (acc[e.pool_id] ?? 0) + 1;
    return acc;
  }, {});

  const poolsWithCounts = allPools.map((p) => ({
    ...p,
    entry_count: countMap[p.id] ?? 0,
  }));

  // Filter out archived pools
  const visiblePools = poolsWithCounts.filter((p) => p.status !== "archived");

  // Sort: open/live first, then locked, then complete/settled
  const statusOrder: Record<string, number> = { open: 0, live: 1, locked: 2, draft: 3, complete: 4, settling: 5, settled: 6 };
  visiblePools.sort((a, b) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9));

  return (
    <>
      <NavBar />

      {/* Hero */}
      <div
        style={{
          padding: "48px 24px 40px",
          textAlign: "center",
          background: "linear-gradient(180deg, var(--surface) 0%, var(--bg) 100%)",
        }}
      >
        <div style={{ display: "inline-flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <HoselLogo size={48} />
          <span style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
            <span style={{ fontWeight: 800, fontSize: "var(--text-3xl)", color: "var(--cream)" }}>hosel</span>
            <span style={{ fontWeight: 400, fontSize: 18, color: "var(--text-dim)" }}>.io</span>
          </span>
        </div>

        <p style={{ fontSize: "var(--text-lg)", color: "var(--text-muted)", marginBottom: 6 }}>
          Pick your players. Follow the action. Claim the pot.
        </p>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-dim)", marginBottom: 28 }}>
          All pools use tokens — settle up with your crew however you like.
        </p>

        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <Link href="/create">
            <button className="btn-primary">Create a Pool</button>
          </Link>
          <Link href="/join">
            <button className="btn-secondary">Join with Code</button>
          </Link>
        </div>
      </div>

      {/* Pool list */}
      <div style={{ padding: "0 24px 32px" }}>
        {visiblePools.length > 0 ? (
          <>
            <h2 style={{ fontSize: "var(--text-md)", fontWeight: 700, color: "var(--text-muted)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Your Pools
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {visiblePools.map((pool) => (
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                <PoolCard key={pool.id} pool={pool as any} />
              ))}
            </div>
          </>
        ) : (
          <div
            className="card"
            style={{ textAlign: "center", padding: "40px 24px", color: "var(--text-muted)" }}
          >
            <p style={{ fontSize: "var(--text-lg)", marginBottom: 8 }}>No pools yet</p>
            <p style={{ fontSize: "var(--text-base)" }}>Create a pool or join one with a code.</p>
          </div>
        )}
      </div>

      {/* How It Works */}
      <div style={{ padding: "0 24px 48px" }}>
        <h2 style={{ fontSize: "var(--text-md)", fontWeight: 700, color: "var(--text-muted)", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          How It Works
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
          }}
        >
          {[
            { icon: "🪙", title: "Stake", desc: "Everyone puts in tokens to join the pool" },
            { icon: "🏌️", title: "Pick", desc: "Choose 1 player from each of 5 tiers" },
            { icon: "📊", title: "Track", desc: "Live scoring auto-updates your lineup" },
            { icon: "🏆", title: "Win", desc: "Top 3 each day & overall winner take tokens" },
          ].map((item) => (
            <div
              key={item.title}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-xl)",
                padding: 14,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 6 }}>{item.icon}</div>
              <div style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--cream)", marginBottom: 4 }}>
                {item.title}
              </div>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--text-dim)" }}>
                {item.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
