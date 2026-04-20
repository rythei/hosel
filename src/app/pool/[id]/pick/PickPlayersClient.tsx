"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChipIcon, TokenAmount } from "@/components/HoselLogo";
import { createClient } from "@/lib/supabase/client";
import type { Pool, TournamentPlayer, PoolEntry } from "@/types";

interface Props {
  pool: Pool & { tournament: { name: string; course: string; start_date: string } };
  entry: PoolEntry;
  tierGroups: Record<number, TournamentPlayer[]>;
  tierLabels: Record<number, string>;
  tierColors: Record<number, string>;
  authUserId: string;
}

export function PickPlayersClient({ pool, entry, tierGroups, tierLabels, tierColors }: Props) {
  const router = useRouter();

  // Pre-populate existing picks
  const initialPicks: Record<number, string> = {};
  if (entry.picks) {
    for (const [tier, playerId] of Object.entries(entry.picks)) {
      initialPicks[Number(tier)] = playerId as string;
    }
  }

  const [picks, setPicks] = useState<Record<number, string>>(initialPicks);
  const [tiebreaker, setTiebreaker] = useState({
    r1: entry.tiebreaker?.r1 ?? null as number | null,
    r2: entry.tiebreaker?.r2 ?? null as number | null,
    r3: entry.tiebreaker?.r3 ?? null as number | null,
    r4: entry.tiebreaker?.r4 ?? null as number | null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const numTiers = pool.num_tiers;
  const totalPicks = Object.keys(picks).length;
  const allPicked = totalPicks === numTiers;

  function selectPlayer(tier: number, playerId: string) {
    setPicks((prev) => {
      if (prev[tier] === playerId) {
        const next = { ...prev };
        delete next[tier];
        return next;
      }
      return { ...prev, [tier]: playerId };
    });
  }

  async function handleSubmit() {
    if (!allPicked) return;
    setSubmitting(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase
      .from("pool_entries")
      .update({
        picks: Object.fromEntries(Object.entries(picks).map(([k, v]) => [k, v])),
        tiebreaker,
      })
      .eq("id", entry.id);

    if (error) {
      setError(error.message);
      setSubmitting(false);
    } else {
      router.push(`/pool/${pool.id}/leaderboard`);
    }
  }

  const pendingBuyin = entry.buyin_status === "pending" && pool.require_buyin_confirmation;

  return (
    <div style={{ padding: "20px 24px 120px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: 800, color: "var(--cream)" }}>
          Pick Your Players
        </h1>
        <span
          style={{
            fontSize: "var(--text-sm)",
            fontWeight: 700,
            padding: "4px 10px",
            borderRadius: "var(--radius-full)",
            background: allPicked ? "rgba(52,122,74,0.15)" : "rgba(138,96,48,0.15)",
            color: allPicked ? "var(--green-light)" : "var(--gold)",
            border: `1px solid ${allPicked ? "rgba(52,122,74,0.3)" : "rgba(138,96,48,0.3)"}`,
          }}
        >
          {totalPicks}/{numTiers}
        </span>
      </div>

      <p style={{ fontSize: "var(--text-base)", color: "var(--text-muted)", marginBottom: 4 }}>
        {pool.tournament.name} · {pool.tournament.course} · 1 per tier
      </p>
      <p style={{ fontSize: "var(--text-sm)", color: "var(--text-dim)", marginBottom: 16 }}>
        Entry: <TokenAmount amount={pool.buy_in} size={12} /> · {pool.scoring_method.replace(/_/g, " ")}
      </p>

      {/* Progress bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
        {Array.from({ length: numTiers }, (_, i) => i + 1).map((tier) => (
          <div
            key={tier}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              background: picks[tier] ? tierColors[tier] : "rgba(90,102,96,0.25)",
              transition: "background 0.3s",
            }}
          />
        ))}
      </div>

      {/* Pending buy-in warning */}
      {pendingBuyin && (
        <div
          style={{
            background: "rgba(138,96,48,0.08)",
            border: "1px solid rgba(138,96,48,0.25)",
            borderRadius: "var(--radius-lg)",
            padding: "10px 14px",
            marginBottom: 20,
            fontSize: "var(--text-sm)",
            color: "var(--gold)",
          }}
        >
          Your picks will be locked in once the organizer confirms your buy-in.
        </div>
      )}

      {/* Tier sections */}
      {Array.from({ length: numTiers }, (_, i) => i + 1).map((tier) => (
        <div key={tier} style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: tierColors[tier], letterSpacing: 1, textTransform: "uppercase" }}>
              Tier {tier}
            </span>
            <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
              {tierLabels[tier]}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {tierGroups[tier]?.length === 0 && (
              <p style={{ color: "var(--text-dim)", fontSize: "var(--text-sm)", padding: "8px 0" }}>
                No players assigned to this tier yet.
              </p>
            )}
            {(tierGroups[tier] ?? []).map((player) => {
              const selected = picks[tier] === player.id;
              return (
                <button
                  key={player.id}
                  onClick={() => selectPlayer(tier, player.id)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    background: selected ? `${tierColors[tier]}14` : "var(--card)",
                    border: `1.5px solid ${selected ? tierColors[tier] : "var(--border)"}`,
                    borderRadius: "var(--radius-xl)",
                    padding: "12px 16px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    transition: "all 0.15s ease",
                  }}
                >
                  {/* Radio circle */}
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      border: `2px solid ${selected ? tierColors[tier] : "var(--text-dim)"}`,
                      background: selected ? tierColors[tier] : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      fontSize: 11,
                      color: "white",
                      fontWeight: 700,
                    }}
                  >
                    {selected && "✓"}
                  </div>

                  {/* Player info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "var(--text-md)", fontWeight: 600, color: "var(--cream)" }}>
                      {player.name}
                    </div>
                    {player.world_ranking && (
                      <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                        World #{player.world_ranking}
                      </div>
                    )}
                  </div>

                  {/* Odds */}
                  {player.odds && (
                    <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", fontFamily: "monospace" }}>
                      {player.odds}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Tiebreaker */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-2xl)",
          padding: 20,
          marginBottom: 24,
        }}
      >
        <h3 style={{ fontSize: "var(--text-md)", fontWeight: 700, color: "var(--cream)", marginBottom: 4 }}>
          Tiebreaker
        </h3>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginBottom: 14 }}>
          Predict the lowest round score by any player in the field
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
          {(["r1", "r2", "r3", "r4"] as const).map((round, i) => (
            <div key={round}>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: 4, textAlign: "center" }}>
                R{i + 1}
              </div>
              <input
                type="number"
                value={tiebreaker[round] ?? ""}
                onChange={(e) => setTiebreaker((prev) => ({ ...prev, [round]: e.target.value ? Number(e.target.value) : null }))}
                placeholder="-7"
                inputMode="numeric"
                className="input"
                style={{ textAlign: "center", fontFamily: "monospace" }}
              />
            </div>
          ))}
        </div>
      </div>

      {error && (
        <p style={{ color: "var(--red)", fontSize: "var(--text-sm)", marginBottom: 12 }}>{error}</p>
      )}

      {/* Sticky submit button */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: 900,
          padding: "16px 24px",
          background: "var(--bg)",
          borderTop: "1px solid var(--border)",
        }}
      >
        <button
          className={allPicked ? "btn-primary" : "btn-secondary"}
          style={{ width: "100%" }}
          disabled={!allPicked || submitting}
          onClick={handleSubmit}
        >
          {!allPicked
            ? `Select ${numTiers - totalPicks} more player${numTiers - totalPicks !== 1 ? "s" : ""}`
            : submitting
            ? "Locking in picks…"
            : (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                Lock In Picks · <ChipIcon size={14} color="white" /> {pool.buy_in}
              </span>
            )
          }
        </button>
      </div>
    </div>
  );
}
