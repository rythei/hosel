"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { TokenAmount } from "@/components/HoselLogo";
import { createClient } from "@/lib/supabase/client";
import type { Pool, LeaderboardRow } from "@/types";

type RoundTab = "R1" | "R2" | "R3" | "R4" | "Total";

interface Props {
  pool: Pool & { tournament: { name: string; course: string; status: string; current_round: number | null } };
  leaderboard: LeaderboardRow[];
  entryCount: number;
  totalPot: number;
  isAdmin: boolean;
  poolId: string;
  isPublic: boolean;
  hasEntry: boolean;
  isAuthenticated: boolean;
}

function formatScore(score: number | null): string {
  if (score === null) return "—";
  if (score === 0) return "E";
  return score > 0 ? `+${score}` : `${score}`;
}

export function LeaderboardClient({ pool, leaderboard: initial, entryCount, totalPot, isAdmin, poolId, isPublic, hasEntry, isAuthenticated }: Props) {
  const [activeTab, setActiveTab] = useState<RoundTab>("Total");
  const [rows, setRows] = useState<LeaderboardRow[]>(initial);
  const rounds: RoundTab[] = ["R1", "R2", "R3", "R4", "Total"];

  // Supabase Realtime — re-fetch when tournament_players update
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`leaderboard:${poolId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tournament_players" },
        async () => {
          const res = await fetch(`/api/pools/${poolId}/leaderboard`);
          if (res.ok) {
            const data = await res.json();
            setRows(data.leaderboard);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [poolId]);

  const leader = rows[0];
  const isLive = pool.tournament.status === "in_progress";

  const roundPct = pool.payout_structure.rounds.percentage;
  const splits = pool.payout_structure.rounds.splits;
  const overallPct = pool.payout_structure.overall.percentage;
  const first = Math.floor(totalPot * (roundPct / 100) * (splits.first / 100));
  const second = Math.floor(totalPot * (roundPct / 100) * (splits.second / 100));
  const third = Math.floor(totalPot * (roundPct / 100) * (splits.third / 100));
  const overall = Math.floor(totalPot * (overallPct / 100));

  return (
    <div style={{ paddingBottom: 32 }}>
      {/* Stats Bar */}
      <div
        style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
          padding: "14px 24px",
          display: "flex",
          justifyContent: "space-around",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        {[
          { label: "Entries", value: <span style={{ color: "var(--cream)", fontWeight: 700 }}>{entryCount}</span> },
          { label: "Pot", value: <TokenAmount amount={totalPot} color="var(--gold)" /> },
          { label: "Leader", value: <span style={{ color: "var(--gold)", fontWeight: 700 }}>{leader?.display_name ?? "—"}</span> },
          {
            label: `Round ${pool.tournament.current_round ?? "—"} of 4`,
            value: isLive ? (
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span className="pulse-dot" style={{ background: "var(--green-light)" }} />
                <span style={{ color: "var(--green-light)", fontWeight: 700, fontSize: "var(--text-sm)" }}>Live</span>
              </span>
            ) : (
              <span style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
                {pool.tournament.status === "complete" ? "Final" : pool.status === "settled" || pool.status === "archived" ? "Final" : "Upcoming"}
              </span>
            ),
          },
        ].map(({ label, value }) => (
          <div key={label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: "var(--text-xs)", color: "var(--text-dim)", marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: "var(--text-sm)" }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Public join / sign-in banner */}
      {isPublic && !hasEntry && pool.status === "open" && (
        <div style={{ margin: "16px 24px 0", background: "rgba(40,94,58,0.08)", border: "1px solid rgba(40,94,58,0.25)", borderRadius: "var(--radius-xl)", padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--green-light)", marginBottom: 2 }}>This pool is open to join</div>
            <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>Buy-in: {pool.buy_in} tokens</div>
          </div>
          {isAuthenticated ? (
            <a href={`/pool/${poolId}/pick`} style={{ textDecoration: "none" }}>
              <button className="btn-primary" style={{ fontSize: "var(--text-sm)", padding: "8px 16px", whiteSpace: "nowrap" }}>
                Join &amp; Pick
              </button>
            </a>
          ) : (
            <a href={`/auth/login?next=/pool/${poolId}/leaderboard`} style={{ textDecoration: "none" }}>
              <button className="btn-primary" style={{ fontSize: "var(--text-sm)", padding: "8px 16px", whiteSpace: "nowrap" }}>
                Sign in to Join
              </button>
            </a>
          )}
        </div>
      )}

      {/* Payout Banner */}
      <div
        style={{
          margin: "16px 24px",
          background: "linear-gradient(135deg, var(--card) 0%, color-mix(in srgb, var(--green) 12%, var(--card)) 100%)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-xl)",
          padding: "14px 18px",
          display: "flex",
          justifyContent: "space-around",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        {[
          { label: "1st", amount: first, sub: "per round" },
          { label: "2nd", amount: second, sub: "per round" },
          { label: "3rd", amount: third, sub: "per round" },
          { label: "Overall", amount: overall, sub: "total winner" },
        ].map(({ label, amount, sub }) => (
          <div key={label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: 2 }}>{label}</div>
            <TokenAmount amount={amount} color={label === "1st" || label === "Overall" ? "var(--gold)" : "var(--chip)"} size={13} />
            <div style={{ fontSize: "var(--text-xs)", color: "var(--text-dim)", marginTop: 2 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Round Tabs */}
      <div style={{ padding: "0 24px", marginBottom: 16 }}>
        <div className="tab-bar">
          {rounds.map((r) => (
            <button
              key={r}
              className={`tab ${activeTab === r ? "active" : ""}`}
              onClick={() => setActiveTab(r)}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Leaderboard Table */}
      <div style={{ padding: "0 24px" }}>
        {/* Header row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "32px 1fr 48px 48px 48px 60px",
            gap: 4,
            padding: "0 12px 8px",
            fontSize: "var(--text-xs)",
            color: "var(--text-dim)",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          <span>#</span>
          <span>Player</span>
          <span style={{ textAlign: "center" }}>R1</span>
          <span style={{ textAlign: "center" }}>R2</span>
          <span style={{ textAlign: "center" }}>R3</span>
          <span style={{ textAlign: "right" }}>Total</span>
        </div>

        {/* Rows */}
        {rows.map((row, idx) => {
          const isFirst = row.rank === 1;
          const isTop3 = row.rank <= 3;
          return (
            <div
              key={row.entry_id}
              style={{
                display: "grid",
                gridTemplateColumns: "32px 1fr 48px 48px 48px 60px",
                gap: 4,
                padding: "12px",
                borderRadius: "var(--radius-lg)",
                background: isFirst ? "rgba(138,96,48,0.03)" : idx % 2 === 0 ? "var(--surface)" : "transparent",
                border: isFirst ? "1px solid rgba(138,96,48,0.15)" : "1px solid transparent",
                marginBottom: 4,
                alignItems: "center",
              }}
            >
              {/* Rank */}
              <span
                style={{
                  fontWeight: 800,
                  fontSize: "var(--text-base)",
                  color: isFirst ? "var(--gold)" : isTop3 ? "var(--green-light)" : "var(--text-muted)",
                }}
              >
                {row.rank}
              </span>

              {/* Player */}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: "var(--text-md)", fontWeight: 600, color: "var(--cream)", display: "flex", alignItems: "center", gap: 4 }}>
                  {isFirst && <span style={{ fontSize: 11 }}>🏆</span>}
                  {row.display_name}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--text-dim)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {row.picks.map((p) => p.player_name).join(" · ")}
                </div>
              </div>

              {/* Round scores */}
              {([row.r1_score, row.r2_score, row.r3_score] as (number | null)[]).map((score, i) => (
                <span
                  key={i}
                  style={{
                    textAlign: "center",
                    fontFamily: "monospace",
                    fontSize: "var(--text-base)",
                    fontWeight: 500,
                    color: score === null ? "var(--text-dim)" : "var(--text)",
                    opacity: activeTab === `R${i + 1}` ? 1 : activeTab === "Total" ? 1 : 0.4,
                  }}
                >
                  {formatScore(score)}
                </span>
              ))}

              {/* Total */}
              <span
                style={{
                  textAlign: "right",
                  fontFamily: "monospace",
                  fontSize: 15,
                  fontWeight: 800,
                  color: isFirst ? "var(--gold)" : isTop3 ? "var(--green-light)" : "var(--text)",
                }}
              >
                {formatScore(row.total_score)}
              </span>
            </div>
          );
        })}

        {rows.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
            No picks submitted yet.
          </div>
        )}
      </div>

      {/* Scoring rules note */}
      <div
        style={{
          margin: "20px 24px 0",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "12px 16px",
          fontSize: "var(--text-sm)",
          color: "var(--text-muted)",
        }}
      >
        <span style={{ fontWeight: 600, color: "var(--cream)" }}>Scoring: </span>
        {pool.scoring_method.replace(/_/g, " ")} player scores each day.
        Need {pool.cut_rule_minimum}+ players to make the cut for R3/R4 &amp; overall eligibility.
        Tiebreaker = sum of predicted lowest daily scores.
      </div>

      {/* Admin link */}
      {isAdmin && (
        <div style={{ margin: "16px 24px 0", textAlign: "center" }}>
          <Link
            href={`/pool/${poolId}/manage`}
            style={{ fontSize: "var(--text-sm)", color: "var(--green-light)", textDecoration: "none", fontWeight: 600 }}
          >
            ⚙ Manage Pool
          </Link>
        </div>
      )}
    </div>
  );
}
