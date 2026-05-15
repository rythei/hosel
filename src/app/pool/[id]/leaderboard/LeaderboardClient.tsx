"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { TokenAmount } from "@/components/HoselLogo";
import { createClient } from "@/lib/supabase/client";
import type { Pool, LeaderboardRow } from "@/types";

type SortBy = "total" | "r1" | "r2" | "r3" | "r4";

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

// Returns the indices of picks whose scores count toward the round total
function getCountingIndices(scores: (number | null)[], method: string): Set<number> {
  const n = method === "best_3_of_5" ? 3 : method === "best_4_of_5" ? 4 : scores.length;
  const valid = scores
    .map((s, i) => ({ s, i }))
    .filter((x): x is { s: number; i: number } => x.s !== null);
  const sorted = [...valid].sort((a, b) => a.s - b.s);
  return new Set(sorted.slice(0, n).map((x) => x.i));
}

// Compute tokens won per entry based on current standings.
// Round payouts are only shown once that round is finished (current_round has advanced past it).
function computeWinnings(
  rows: LeaderboardRow[],
  pool: Pool,
  totalPot: number,
  tournamentStatus: string,
  currentRound: number | null
): Record<string, number> {
  const winnings: Record<string, number> = {};
  const roundPot = Math.floor(totalPot * (pool.payout_structure.rounds.percentage / 100));
  const overallPot = Math.floor(totalPot * (pool.payout_structure.overall.percentage / 100));
  const splits = pool.payout_structure.rounds.splits;

  // A round is "complete" if the tournament is done, or current_round has moved past it.
  const isComplete = (roundNum: number) =>
    tournamentStatus === "complete" || (currentRound !== null && currentRound > roundNum);

  (["r1_score", "r2_score", "r3_score", "r4_score"] as const).forEach((key, i) => {
    if (!isComplete(i + 1)) return; // skip rounds still in progress
    const eligible = rows.filter((r) => r[key] !== null);
    if (eligible.length === 0) return;
    const sorted = [...eligible].sort((a, b) => (a[key] as number) - (b[key] as number));
    ([splits.first, splits.second, splits.third] as number[]).forEach((pct, idx) => {
      const entry = sorted[idx];
      if (entry) winnings[entry.entry_id] = (winnings[entry.entry_id] ?? 0) + Math.floor(roundPot * pct / 100);
    });
  });

  // Overall winner only shown when tournament is complete
  if (tournamentStatus === "complete") {
    const overallWinner = rows.find((r) => r.total_score !== null);
    if (overallWinner) winnings[overallWinner.entry_id] = (winnings[overallWinner.entry_id] ?? 0) + overallPot;
  }

  return winnings;
}

export function LeaderboardClient({ pool, leaderboard: initial, entryCount, totalPot, isAdmin, poolId, isPublic, hasEntry, isAuthenticated }: Props) {
  const [rows, setRows] = useState<LeaderboardRow[]>(initial);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>("total");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`leaderboard:${poolId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tournament_players" }, async () => {
        const res = await fetch(`/api/pools/${poolId}/leaderboard`);
        if (res.ok) {
          const data = await res.json();
          setRows(data.leaderboard);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [poolId]);

  // Sort rows by selected column; server provides total-sorted order by default
  const sortedRows = useMemo(() => {
    if (sortBy === "total") return rows;
    const key = `${sortBy}_score` as "r1_score" | "r2_score" | "r3_score" | "r4_score";
    return [...rows].sort((a, b) => {
      const va = a[key] as number | null;
      const vb = b[key] as number | null;
      if (va === null && vb === null) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      return va - vb;
    });
  }, [rows, sortBy]);

  // Compute display ranks for current sort (with ties)
  const displayRanks = useMemo(() => {
    if (sortBy === "total") return sortedRows.map((r) => r.rank);
    const key = `${sortBy}_score` as "r1_score" | "r2_score" | "r3_score" | "r4_score";
    const ranks: number[] = [];
    let rank = 1;
    for (let i = 0; i < sortedRows.length; i++) {
      if (i > 0 && sortedRows[i][key] !== sortedRows[i - 1][key]) rank = i + 1;
      ranks.push(rank);
    }
    return ranks;
  }, [sortedRows, sortBy]);

  const leader = sortedRows[0];
  const isLive = pool.tournament.status === "in_progress";

  const roundPct = pool.payout_structure.rounds.percentage;
  const splits = pool.payout_structure.rounds.splits;
  const overallPct = pool.payout_structure.overall.percentage;
  const first = Math.floor(totalPot * (roundPct / 100) * (splits.first / 100));
  const second = Math.floor(totalPot * (roundPct / 100) * (splits.second / 100));
  const third = Math.floor(totalPot * (roundPct / 100) * (splits.third / 100));
  const overall = Math.floor(totalPot * (overallPct / 100));

  const winnings = computeWinnings(rows, pool, totalPot, pool.tournament.status, pool.tournament.current_round);

  // TB badge: only the tiebreaker winner(s) within a score group that has a rank split.
  // Walk through each group of same-score entries; if ranks differ, badge the top-ranked ones.
  const tbWinnerIds = new Set<string>();
  let gi = 0;
  while (gi < rows.length) {
    const score = rows[gi].total_score;
    if (score === null) { gi++; continue; }
    let gj = gi;
    while (gj < rows.length && rows[gj].total_score === score) gj++;
    const group = rows.slice(gi, gj);
    if (group.length > 1) {
      const minRank = Math.min(...group.map((r) => r.rank));
      const hasRankSplit = group.some((r) => r.rank !== minRank);
      if (hasRankSplit) group.filter((r) => r.rank === minRank).forEach((r) => tbWinnerIds.add(r.entry_id));
    }
    gi = gj;
  }

  // Desktop: rank / name / R1 / R2 / R3 / R4 / Total / Won
  // Mobile: rank / name / (active round) / Total / Won
  const gridCols = isMobile
    ? sortBy === "total" ? "28px 1fr 52px 60px" : "28px 1fr 40px 48px 60px"
    : "28px 1fr 36px 36px 36px 36px 48px 56px";

  const ROUND_KEYS: SortBy[] = ["r1", "r2", "r3", "r4"];
  const colHeaderStyle = (col: SortBy): React.CSSProperties => ({
    textAlign: "center" as const,
    cursor: "pointer",
    color: sortBy === col ? "var(--green-light)" : "var(--text-dim)",
    fontWeight: sortBy === col ? 800 : 600,
    background: "none",
    border: "none",
    padding: 0,
    fontSize: "var(--text-xs)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    whiteSpace: "nowrap" as const,
  });

  return (
    <div style={{ paddingBottom: 32 }}>
      {/* Stats Bar */}
      <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", padding: "14px 24px", display: "flex", justifyContent: "space-around", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
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
              <button className="btn-primary" style={{ fontSize: "var(--text-sm)", padding: "8px 16px", whiteSpace: "nowrap" }}>Join &amp; Pick</button>
            </a>
          ) : (
            <a href={`/auth/login?next=/pool/${poolId}/leaderboard`} style={{ textDecoration: "none" }}>
              <button className="btn-primary" style={{ fontSize: "var(--text-sm)", padding: "8px 16px", whiteSpace: "nowrap" }}>Sign in to Join</button>
            </a>
          )}
        </div>
      )}

      {/* Payout Banner */}
      <div style={{ margin: "16px 24px", background: "linear-gradient(135deg, var(--card) 0%, color-mix(in srgb, var(--green) 12%, var(--card)) 100%)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "14px 18px", display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: 8 }}>
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

      {/* Round Tabs — mobile only */}
      {isMobile && (
        <div style={{ padding: "0 24px", marginBottom: 16 }}>
          <div className="tab-bar">
            {(["r1", "r2", "r3", "r4", "total"] as SortBy[]).map((s) => (
              <button key={s} className={`tab ${sortBy === s ? "active" : ""}`} onClick={() => setSortBy(s)}>
                {s === "total" ? "Total" : s.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      <div style={{ padding: "0 24px" }}>
        {/* Header */}
        <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: 4, padding: "0 12px 8px", fontSize: "var(--text-xs)", color: "var(--text-dim)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", alignItems: "center" }}>
          <span>#</span>
          <span>Player</span>
          {isMobile ? (
            <>
              {sortBy !== "total" && <span style={{ textAlign: "center", color: "var(--green-light)", fontWeight: 800 }}>{sortBy.toUpperCase()}</span>}
              <button onClick={() => setSortBy("total")} style={{ ...colHeaderStyle("total"), justifyContent: "flex-end" }}>
                Total{sortBy === "total" && " ▲"}
              </button>
            </>
          ) : (
            <>
              {ROUND_KEYS.map((rk) => (
                <button key={rk} onClick={() => setSortBy(sortBy === rk ? "total" : rk)} style={colHeaderStyle(rk)}>
                  {rk.toUpperCase()}{sortBy === rk && " ▲"}
                </button>
              ))}
              <button onClick={() => setSortBy("total")} style={{ ...colHeaderStyle("total"), justifyContent: "flex-end" }}>
                Total{sortBy === "total" && " ▲"}
              </button>
            </>
          )}
          <span style={{ textAlign: "right" }}>Won</span>
        </div>

        {sortedRows.map((row, idx) => {
          const displayRank = displayRanks[idx];
          const isFirst = displayRank === 1;
          const isTop3 = displayRank <= 3;
          const isExpanded = expandedRow === row.entry_id;
          const won = winnings[row.entry_id] ?? 0;

          const isTiedWithPrev = sortBy === "total" && tbWinnerIds.has(row.entry_id);

          return (
            <div key={row.entry_id} style={{ marginBottom: 4 }}>
              {/* Main row */}
              <div
                onClick={() => setExpandedRow(isExpanded ? null : row.entry_id)}
                style={{ display: "grid", gridTemplateColumns: gridCols, gap: 4, padding: "12px", borderRadius: isExpanded ? "var(--radius-lg) var(--radius-lg) 0 0" : "var(--radius-lg)", background: isFirst ? "rgba(138,96,48,0.03)" : idx % 2 === 0 ? "var(--surface)" : "transparent", border: isFirst ? "1px solid rgba(138,96,48,0.15)" : "1px solid transparent", alignItems: "center", cursor: "pointer" }}
              >
                {/* Rank */}
                <span style={{ fontWeight: 800, fontSize: "var(--text-base)", color: isFirst ? "var(--gold)" : isTop3 ? "var(--green-light)" : "var(--text-muted)" }}>
                  {displayRank}
                </span>

                {/* Name + picks preview */}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--cream)", display: "flex", alignItems: "center", gap: 4, overflow: "hidden" }}>
                    {isFirst && <span style={{ fontSize: 11, flexShrink: 0 }}>🏆</span>}
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.display_name}</span>
                    {isTiedWithPrev && (
                      <span style={{ fontSize: 9, color: "var(--gold)", fontWeight: 700, flexShrink: 0, background: "rgba(138,96,48,0.15)", padding: "1px 4px", borderRadius: 3 }}>TB</span>
                    )}
                    <span style={{ fontSize: 10, color: "var(--text-dim)", flexShrink: 0 }}>{isExpanded ? "▲" : "▼"}</span>
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {row.picks.map((p) => p.player_name).join(" · ")}
                  </div>
                </div>

                {/* Round scores — all inline on desktop, active tab only on mobile */}
                {isMobile ? (
                  sortBy !== "total" && (() => {
                    const key = `${sortBy}_score` as "r1_score" | "r2_score" | "r3_score" | "r4_score";
                    const rs = row[key] as number | null;
                    return <span style={{ textAlign: "center", fontFamily: "monospace", fontSize: "var(--text-sm)", fontWeight: 500, color: rs === null ? "var(--text-dim)" : "var(--text)" }}>{formatScore(rs)}</span>;
                  })()
                ) : (
                  ([row.r1_score, row.r2_score, row.r3_score, row.r4_score] as (number | null)[]).map((rs, ri) => (
                    <span key={ri} style={{ textAlign: "center", fontFamily: "monospace", fontSize: "var(--text-sm)", fontWeight: 500, color: rs === null ? "var(--text-dim)" : "var(--text)" }}>
                      {formatScore(rs)}
                    </span>
                  ))
                )}

                {/* Total */}
                <span style={{ textAlign: "right", fontFamily: "monospace", fontSize: 15, fontWeight: 800, color: isFirst ? "var(--gold)" : isTop3 ? "var(--green-light)" : "var(--text)" }}>
                  {formatScore(row.total_score)}
                </span>

                {/* Won */}
                <span style={{ textAlign: "right" }}>
                  {won > 0 ? (
                    <TokenAmount amount={won} size={11} color="var(--gold)" />
                  ) : (
                    <span style={{ fontFamily: "monospace", fontSize: "var(--text-xs)", color: "var(--text-dim)" }}>—</span>
                  )}
                </span>
              </div>

              {/* Expanded breakdown */}
              {isExpanded && (
                <div style={{ background: "var(--surface)", border: isFirst ? "1px solid rgba(138,96,48,0.15)" : "1px solid var(--border)", borderTop: "none", borderRadius: "0 0 var(--radius-lg) var(--radius-lg)", padding: "8px 12px 12px" }}>
                  {/* Sub-header */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 48px 48px 48px 48px", gap: 4, padding: "4px 0 6px", borderBottom: "1px solid var(--border)", marginBottom: 6 }}>
                    <span style={{ fontSize: 10, color: "var(--text-dim)", fontWeight: 600, textTransform: "uppercase" }}>Player</span>
                    {["R1","R2","R3","R4"].map((r) => (
                      <span key={r} style={{ fontSize: 10, color: "var(--text-dim)", fontWeight: 600, textAlign: "center", textTransform: "uppercase" }}>{r}</span>
                    ))}
                  </div>

                  {row.picks.map((pick, pickIdx) => {
                    const isCut = pick.status === "cut";
                    const isOut = pick.status === "withdrawn" || pick.status === "disqualified";
                    const roundScores = [pick.r1, pick.r2, pick.r3, pick.r4];

                    return (
                      <div key={pick.player_name} style={{ display: "grid", gridTemplateColumns: "1fr 48px 48px 48px 48px", gap: 4, padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", alignItems: "center" }}>
                        <div>
                          <span style={{ fontSize: "var(--text-xs)", color: isCut || isOut ? "var(--text-dim)" : "var(--cream)", fontWeight: 500 }}>
                            {pick.player_name}
                          </span>
                          {(isCut || isOut) && (
                            <span style={{ fontSize: 9, color: "var(--red)", fontWeight: 700, marginLeft: 5, textTransform: "uppercase" }}>
                              {isCut ? "CUT" : "WD"}
                            </span>
                          )}
                        </div>
                        {roundScores.map((score, rIdx) => {
                          const roundKey = `r${rIdx + 1}` as "r1" | "r2" | "r3" | "r4";
                          const allRoundScores = row.picks.map((p) => p[roundKey]);
                          const countingSet = getCountingIndices(allRoundScores, pool.scoring_method);
                          const isCounting = score !== null && countingSet.has(pickIdx);
                          const isActiveRound = sortBy === `r${rIdx + 1}`;
                          const isVisible = !isMobile || sortBy === "total" || isActiveRound;
                          return (
                            <span
                              key={rIdx}
                              style={{
                                textAlign: "center",
                                fontFamily: "monospace",
                                fontSize: "var(--text-xs)",
                                fontWeight: isCounting ? 700 : 400,
                                color: score === null ? "var(--text-dim)" : isCounting ? "var(--green-light)" : "var(--text-muted)",
                                opacity: isVisible ? 1 : 0.3,
                                borderRadius: isCounting ? 4 : 0,
                                background: isCounting ? "rgba(52,122,74,0.12)" : "transparent",
                                padding: isCounting ? "1px 4px" : 0,
                                outline: isCounting ? "1px solid rgba(52,122,74,0.35)" : "none",
                              }}
                            >
                              {formatScore(score)}
                            </span>
                          );
                        })}
                      </div>
                    );
                  })}

                  {/* Scoring method note */}
                  <div style={{ marginTop: 6, marginBottom: 2, fontSize: 10, color: "var(--text-dim)", fontStyle: "italic" }}>
                    {pool.scoring_method === "best_3_of_5" ? "Best 3" : pool.scoring_method === "best_4_of_5" ? "Best 4" : "All"} player scores count each round — highlighted in green
                  </div>

                  {/* Tiebreaker row */}
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 10, color: "var(--text-dim)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Tiebreaker</span>
                    {(["r1","r2","r3","r4"] as const).map((rKey, i) => {
                      const val = row.tiebreaker?.[rKey];
                      const isActiveTb = rKey === "r1";
                      return (
                        <span key={rKey} style={{ fontSize: 10, color: val !== null ? (isActiveTb ? "var(--gold)" : "var(--text-muted)") : "var(--text-dim)", background: isActiveTb ? "rgba(138,96,48,0.12)" : "transparent", padding: isActiveTb ? "1px 5px" : 0, borderRadius: isActiveTb ? 3 : 0 }}>
                          <span style={{ color: isActiveTb ? "var(--gold)" : "var(--text-dim)" }}>R{i + 1}:</span>{" "}
                          <span style={{ fontFamily: "monospace", fontWeight: isActiveTb ? 700 : 600 }}>{val ?? "—"}</span>
                        </span>
                      );
                    })}
                    {won > 0 && (
                      <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ fontSize: 10, color: "var(--text-dim)" }}>Earned:</span>
                        <TokenAmount amount={won} size={11} color="var(--gold)" />
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {rows.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>No picks submitted yet.</div>
        )}
      </div>

      {/* Scoring rules note */}
      <div style={{ margin: "20px 24px 0", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "12px 16px", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
        <span style={{ fontWeight: 600, color: "var(--cream)" }}>Scoring: </span>
        {pool.scoring_method.replace(/_/g, " ")} player scores count each round, summed across all rounds.
        {" "}Need {pool.cut_rule_minimum}+ players to make the cut to compete in R3/R4 &amp; overall.
        Tiebreaker = closest predicted daily low score wins ties.
      </div>

      {isAdmin && (
        <div style={{ margin: "16px 24px 0", textAlign: "center" }}>
          <Link href={`/pool/${poolId}/manage`} style={{ fontSize: "var(--text-sm)", color: "var(--green-light)", textDecoration: "none", fontWeight: 600 }}>
            ⚙ Manage Pool
          </Link>
        </div>
      )}
    </div>
  );
}
