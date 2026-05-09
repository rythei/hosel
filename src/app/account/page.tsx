import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { TokenAmount } from "@/components/HoselLogo";
import Link from "next/link";
import type { Pool } from "@/types";

type PoolWithTournament = Pool & {
  tournament: { name: string; course: string; start_date: string };
  role: "organizer" | "member";
};

function statusLabel(status: Pool["status"]) {
  const map: Record<Pool["status"], { label: string; color: string }> = {
    draft:    { label: "Draft",             color: "var(--text-dim)" },
    open:     { label: "Open",              color: "var(--green-light)" },
    locked:   { label: "Picks Locked",      color: "var(--gold)" },
    live:     { label: "Live",              color: "var(--green-light)" },
    complete: { label: "Complete",          color: "var(--text-muted)" },
    settling: { label: "Settling",          color: "var(--gold)" },
    settled:  { label: "Settled",           color: "var(--text-muted)" },
    archived: { label: "Archived",          color: "var(--text-dim)" },
  };
  return map[status] ?? { label: status, color: "var(--text-muted)" };
}

function poolHref(pool: Pool, role: "organizer" | "member") {
  if (role === "organizer") return `/pool/${pool.id}/manage`;
  if (pool.status === "complete" || pool.status === "settling" || pool.status === "settled")
    return `/pool/${pool.id}/settlement`;
  if (pool.status === "open") return `/pool/${pool.id}/pick`;
  return `/pool/${pool.id}/leaderboard`;
}

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("users")
    .select("display_name, avatar_initials, email, created_at")
    .eq("id", authUser.id)
    .single();

  // Pools where user is organizer (exclude archived/cancelled)
  const { data: organizedPools } = await supabase
    .from("pools")
    .select("*, tournament:tournaments(name, course, start_date)")
    .eq("organizer_id", authUser.id)
    .neq("status", "archived")
    .neq("status", "settled")
    .order("created_at", { ascending: false });

  // Pools where user is a participant (but not organizer)
  const { data: entries } = await supabase
    .from("pool_entries")
    .select("pool_id, picks, buyin_status, pool:pools(*, tournament:tournaments(name, course, start_date))")
    .eq("user_id", authUser.id);

  const organizedIds = new Set((organizedPools ?? []).map((p) => p.id));
  const memberPools = (entries ?? [])
    .map((e) => e.pool as unknown as Pool & { tournament: { name: string; course: string; start_date: string } })
    .filter((p) => p && !organizedIds.has(p.id) && p.status !== "archived" && p.status !== "settled");

  const allPools: PoolWithTournament[] = [
    ...(organizedPools ?? []).map((p) => ({ ...p, role: "organizer" as const })),
    ...memberPools.map((p) => ({ ...p, role: "member" as const })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const signOutUrl = `/auth/signout`;

  return (
    <>
      <NavBar />
      <div style={{ padding: "28px 24px 60px" }}>
        {/* Profile header */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "linear-gradient(135deg, var(--green), var(--green-dark))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              fontWeight: 700,
              color: "white",
              flexShrink: 0,
            }}
          >
            {profile?.avatar_initials ?? "?"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: "var(--text-xl)", fontWeight: 800, color: "var(--cream)", marginBottom: 2 }}>
              {profile?.display_name ?? "Unknown"}
            </h1>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {profile?.email ?? authUser.email}
            </p>
          </div>
          <a
            href={signOutUrl}
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--text-muted)",
              textDecoration: "none",
              padding: "6px 12px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border)",
              flexShrink: 0,
            }}
          >
            Sign out
          </a>
        </div>

        {/* Pools */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--cream)" }}>
            Your Pools
          </h2>
          <Link
            href="/create"
            style={{
              fontSize: "var(--text-sm)",
              fontWeight: 600,
              color: "var(--green-light)",
              textDecoration: "none",
              padding: "6px 12px",
              borderRadius: "var(--radius-md)",
              border: "1px solid rgba(52,122,74,0.3)",
              background: "rgba(52,122,74,0.08)",
            }}
          >
            + New Pool
          </Link>
        </div>

        {allPools.length === 0 && (
          <div
            className="card"
            style={{ textAlign: "center", padding: "40px 24px", color: "var(--text-muted)" }}
          >
            <p style={{ marginBottom: 12 }}>You haven&apos;t joined any pools yet.</p>
            <Link href="/" style={{ color: "var(--green-light)", textDecoration: "none", fontSize: "var(--text-sm)", fontWeight: 600 }}>
              Browse pools →
            </Link>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {allPools.map((pool) => {
            const { label, color } = statusLabel(pool.status);
            const href = poolHref(pool, pool.role);
            const entry = (entries ?? []).find((e) => e.pool_id === pool.id);
            const hasPicks = entry?.picks && Object.keys(entry.picks).length > 0;

            return (
              <Link key={pool.id} href={href} style={{ textDecoration: "none" }}>
                <div
                  className="card"
                  style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: "var(--text-base)", fontWeight: 700, color: "var(--cream)" }}>
                        {pool.name}
                      </span>
                      {pool.role === "organizer" && (
                        <span
                          className="badge"
                          style={{
                            fontSize: 10,
                            background: "rgba(40,94,58,0.12)",
                            color: "var(--green-light)",
                            border: "1px solid rgba(40,94,58,0.25)",
                          }}
                        >
                          Organizer
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: 6 }}>
                      {pool.tournament.name}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: "var(--text-xs)", color, fontWeight: 600 }}>
                        {label}
                      </span>
                      <span style={{ fontSize: "var(--text-xs)", color: "var(--text-dim)" }}>·</span>
                      <TokenAmount amount={pool.buy_in} size={11} />
                      {entry && (
                        <>
                          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-dim)" }}>·</span>
                          <span style={{ fontSize: "var(--text-xs)", color: hasPicks ? "var(--green-light)" : "var(--gold)", fontWeight: 500 }}>
                            {hasPicks ? "Picks in" : "No picks"}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: "var(--text-dim)" }}>
                    <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
