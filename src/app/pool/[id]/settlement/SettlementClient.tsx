"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TokenAmount, ChipIcon } from "@/components/HoselLogo";
import { createClient } from "@/lib/supabase/client";
import type { Pool, PoolPayout } from "@/types";

const CATEGORY_LABELS: Record<string, string> = {
  round_1: "Round 1",
  round_2: "Round 2",
  round_3: "Round 3",
  round_4: "Round 4",
  overall: "Overall",
};

const PLACEMENT_LABELS: Record<string, string> = {
  first: "1st Place",
  second: "2nd Place",
  third: "3rd Place",
  winner: "Winner",
};

interface Props {
  pool: Pool & { tournament: { name: string; course: string } };
  payouts: PoolPayout[];
  usersMap: Record<string, string>;
  isAdmin: boolean;
  poolId: string;
  authUserId: string;
}

export function SettlementClient({ pool, payouts: initialPayouts, usersMap, isAdmin, poolId, authUserId }: Props) {
  const router = useRouter();
  const [payouts, setPayouts] = useState<PoolPayout[]>(initialPayouts);
  const [closing, setClosing] = useState(false);

  const distributed = payouts.filter((p) => p.is_distributed).length;
  const total = payouts.length;
  const allDistributed = distributed === total && total > 0;

  const overallWinner = payouts.find((p) => p.category === "overall");
  const myPayouts = payouts.filter((p) => p.user_id === authUserId);
  const myTotal = myPayouts.reduce((sum, p) => sum + p.token_amount, 0);

  async function markDistributed(payoutId: string) {
    const supabase = createClient();
    const payout = payouts.find((p) => p.id === payoutId);
    if (!payout) return;

    await supabase
      .from("pool_payouts")
      .update({ is_distributed: true, distributed_at: new Date().toISOString() })
      .eq("id", payoutId);

    // Credit winner's token balance
    const { data: winner } = await supabase.from("users").select("token_balance").eq("id", payout.user_id).single();
    if (winner) {
      await supabase.from("users").update({ token_balance: winner.token_balance + payout.token_amount }).eq("id", payout.user_id);
    }

    setPayouts((prev) =>
      prev.map((p) =>
        p.id === payoutId ? { ...p, is_distributed: true, distributed_at: new Date().toISOString() } : p
      )
    );
  }

  async function closePool() {
    setClosing(true);
    const supabase = createClient();
    await supabase.from("pools").update({ status: "settled" }).eq("id", poolId);
    router.push("/history");
  }

  if (payouts.length === 0) {
    return (
      <div style={{ padding: "32px 24px", textAlign: "center" }}>
        <p style={{ color: "var(--text-muted)", fontSize: "var(--text-base)", marginBottom: 20 }}>
          No payouts calculated yet — the tournament may still be in progress.
        </p>
        {isAdmin && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 320, margin: "0 auto" }}>
            <a
              href={`/pool/${poolId}/manage`}
              style={{
                display: "block", padding: "12px 16px", borderRadius: "var(--radius-lg)",
                background: "var(--card)", border: "1px solid var(--border)",
                color: "var(--cream)", fontWeight: 600, fontSize: "var(--text-sm)", textDecoration: "none",
              }}
            >
              ⚙ Manage Pool
            </a>
            <a
              href={`/pool/${poolId}/leaderboard`}
              style={{
                display: "block", padding: "12px 16px", borderRadius: "var(--radius-lg)",
                background: "var(--card)", border: "1px solid var(--border)",
                color: "var(--cream)", fontWeight: 600, fontSize: "var(--text-sm)", textDecoration: "none",
              }}
            >
              📊 View Leaderboard
            </a>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 24px 48px" }}>
      {/* Winner Banner */}
      {overallWinner && (
        <div
          style={{
            background: "linear-gradient(135deg, rgba(138,96,48,0.1), rgba(138,96,48,0.05))",
            border: "1px solid rgba(138,96,48,0.3)",
            borderRadius: "var(--radius-2xl)",
            padding: "24px",
            textAlign: "center",
            marginBottom: 20,
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 8 }}>🏆</div>
          <div style={{ fontSize: "var(--text-2xl)", fontWeight: 800, color: "var(--gold)", marginBottom: 4 }}>
            {usersMap[overallWinner.user_id]} wins the pool!
          </div>
          <TokenAmount amount={overallWinner.token_amount} color="var(--gold)" size={16} />
        </div>
      )}

      {/* Pool summary */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 style={{ fontSize: "var(--text-xl)", fontWeight: 700, color: "var(--cream)" }}>Pool Summary</h2>
          <span
            className="badge"
            style={{
              background: allDistributed ? "rgba(52,122,74,0.12)" : "rgba(138,96,48,0.12)",
              color: allDistributed ? "var(--green-light)" : "var(--gold)",
              border: `1px solid ${allDistributed ? "rgba(52,122,74,0.25)" : "rgba(138,96,48,0.25)"}`,
            }}
          >
            {allDistributed ? "Settled" : "Awaiting Distribution"}
          </span>
        </div>
        <div style={{ fontSize: "var(--text-base)", color: "var(--text-muted)" }}>
          {pool.tournament.name} · {pool.tournament.course}
        </div>
      </div>

      {/* Payout breakdown */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: "var(--text-xl)", fontWeight: 700, color: "var(--cream)", marginBottom: 14 }}>
          Payout Breakdown
        </h2>
        {["round_1", "round_2", "round_3", "round_4", "overall"].map((category) => {
          const catPayouts = payouts.filter((p) => p.category === category);
          if (catPayouts.length === 0) return null;
          return (
            <div key={category} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: category === "overall" ? "var(--gold)" : "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {CATEGORY_LABELS[category]}
              </div>
              {catPayouts.map((p) => (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: "var(--text-base)" }}>
                  <span style={{ color: "var(--cream)" }}>{usersMap[p.user_id]}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>{PLACEMENT_LABELS[p.placement]}</span>
                    <TokenAmount amount={p.token_amount} color={category === "overall" ? "var(--gold)" : "var(--chip)"} size={13} />
                  </span>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Participant view: own payouts */}
      {!isAdmin && myPayouts.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "var(--text-xl)", fontWeight: 700, color: "var(--cream)", marginBottom: 14 }}>
            Your Winnings
          </h2>
          <div style={{ marginBottom: 12 }}>
            <TokenAmount amount={myTotal} color="var(--gold)" size={18} />
          </div>
          {myPayouts.map((p) => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
                {CATEGORY_LABELS[p.category]} · {PLACEMENT_LABELS[p.placement]}
              </span>
              <span
                className="badge"
                style={{
                  background: p.is_distributed ? "rgba(52,122,74,0.12)" : "rgba(138,96,48,0.12)",
                  color: p.is_distributed ? "var(--green-light)" : "var(--gold)",
                  border: `1px solid ${p.is_distributed ? "rgba(52,122,74,0.25)" : "rgba(138,96,48,0.25)"}`,
                }}
              >
                {p.is_distributed ? "Paid ✓" : "Pending"}
              </span>
            </div>
          ))}
        </div>
      )}

      {!isAdmin && myPayouts.length === 0 && (
        <div className="card" style={{ marginBottom: 20, textAlign: "center", padding: "32px" }}>
          <p style={{ color: "var(--text-muted)" }}>Better luck next time 🏌️</p>
        </div>
      )}

      {/* Admin: Distribution checklist */}
      {isAdmin && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 14 }}>
            <h2 style={{ fontSize: "var(--text-xl)", fontWeight: 700, color: "var(--cream)", marginBottom: 4 }}>
              Distribute Payouts
            </h2>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
              Mark each payout as distributed. Tokens clear when all are settled.
            </p>
          </div>

          {/* Progress */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
                {distributed} of {total} payouts distributed
              </span>
              <span style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: distributed === total ? "var(--green-light)" : "var(--gold)" }}>
                {Math.round((distributed / total) * 100)}%
              </span>
            </div>
            <div style={{ height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${(distributed / total) * 100}%`,
                  background: "var(--green)",
                  borderRadius: 2,
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </div>

          {payouts.map((p) => (
            <div
              key={p.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 12px",
                borderRadius: "var(--radius-lg)",
                background: p.is_distributed ? "rgba(52,122,74,0.05)" : "var(--surface)",
                border: `1px solid ${p.is_distributed ? "rgba(52,122,74,0.2)" : "var(--border)"}`,
                marginBottom: 8,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "var(--text-md)", fontWeight: 600, color: "var(--cream)" }}>
                  {usersMap[p.user_id]}
                </div>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                  {CATEGORY_LABELS[p.category]} · {PLACEMENT_LABELS[p.placement]}
                </div>
              </div>
              <TokenAmount amount={p.token_amount} size={13} />
              {p.is_distributed ? (
                <span style={{ color: "var(--green-light)", fontWeight: 700, fontSize: "var(--text-sm)" }}>✓ Paid</span>
              ) : (
                <button
                  className="btn-secondary"
                  style={{ fontSize: "var(--text-xs)", padding: "5px 10px" }}
                  onClick={() => markDistributed(p.id)}
                >
                  Mark Paid
                </button>
              )}
            </div>
          ))}

          {/* All settled */}
          {allDistributed && (
            <div
              style={{
                background: "rgba(52,122,74,0.08)",
                border: "1px solid rgba(52,122,74,0.25)",
                borderRadius: "var(--radius-lg)",
                padding: "16px",
                textAlign: "center",
                marginTop: 8,
              }}
            >
              <div style={{ fontSize: "var(--text-xl)", fontWeight: 700, color: "var(--green-light)", marginBottom: 8 }}>
                Pool is fully settled! 🎉
              </div>
              <button
                className="btn-primary"
                style={{ width: "100%" }}
                onClick={closePool}
                disabled={closing}
              >
                {closing ? "Closing…" : "Close Pool"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Disclaimer */}
      <div className="token-disclaimer">
        <ChipIcon size={16} color="var(--chip)" />
        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
          Tokens are for tracking only. The pool organizer handles all payments outside of Hosel.
        </p>
      </div>
    </div>
  );
}
