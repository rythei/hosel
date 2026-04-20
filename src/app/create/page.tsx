"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { ChipIcon } from "@/components/HoselLogo";
import { createClient } from "@/lib/supabase/client";
import type { Tournament, ScoringMethod } from "@/types";

type Step = 1 | 2 | 3;

const DEFAULT_PAYOUT = {
  rounds: { percentage: 20, splits: { first: 50, second: 35, third: 15 } },
  overall: { percentage: 20 },
};

function StepIndicator({ current }: { current: Step }) {
  const steps = [
    { n: 1, label: "Tournament" },
    { n: 2, label: "Rules" },
    { n: 3, label: "Payouts" },
  ];
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
      {steps.map((s) => (
        <div key={s.n} style={{ flex: 1 }}>
          <div
            style={{
              height: 3,
              borderRadius: 2,
              background: s.n <= current ? "var(--green)" : "rgba(90,102,96,0.25)",
              marginBottom: 5,
              transition: "background 0.3s",
            }}
          />
          <span
            style={{
              fontSize: "var(--text-xs)",
              fontWeight: 600,
              color: s.n <= current ? "var(--cream)" : "var(--text-dim)",
            }}
          >
            {s.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function CreatePoolPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1
  const [selectedTournament, setSelectedTournament] = useState<string>("");
  const [poolName, setPoolName] = useState("");
  const [buyIn, setBuyIn] = useState(25);
  const [maxEntries, setMaxEntries] = useState(30);

  // Step 2
  const [numTiers, setNumTiers] = useState(5);
  const [scoringMethod, setScoringMethod] = useState<ScoringMethod>("best_3_of_5");

  // Step 3
  const [entryDeadline, setEntryDeadline] = useState("");
  const [requireBuyinConfirmation, setRequireBuyinConfirmation] = useState(true);

  useEffect(() => {
    async function loadTournaments() {
      const supabase = createClient();
      const { data } = await supabase
        .from("tournaments")
        .select("*")
        .in("status", ["upcoming", "in_progress"])
        .order("start_date", { ascending: true });
      setTournaments(data ?? []);
    }
    loadTournaments();
  }, []);

  // Auto-fill pool name and deadline when tournament selected
  useEffect(() => {
    if (selectedTournament) {
      const t = tournaments.find((t) => t.id === selectedTournament);
      if (t) {
        setPoolName(`${t.name} Pool`);
        // Default deadline: day before tournament starts at noon
        const d = new Date(t.start_date + "T12:00:00");
        d.setDate(d.getDate() - 1);
        const pad = (n: number) => String(n).padStart(2, "0");
        setEntryDeadline(
          `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T12:00`
        );
      }
    }
  }, [selectedTournament, tournaments]);

  async function handleSubmit() {
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Generate invite code
      const { data: codeData, error: rpcError } = await supabase.rpc("generate_invite_code");
      if (rpcError) throw new Error(`RPC error: ${rpcError.message}`);
      const inviteCode = codeData as string;

      const { data: pool, error: poolError } = await supabase
        .from("pools")
        .insert({
          name: poolName,
          tournament_id: selectedTournament,
          organizer_id: user.id,
          buy_in: buyIn,
          max_entries: maxEntries,
          scoring_method: scoringMethod,
          num_tiers: numTiers,
          cut_rule_minimum: 3,
          payout_structure: DEFAULT_PAYOUT,
          entry_deadline: entryDeadline ? new Date(entryDeadline).toISOString() : new Date().toISOString(),
          invite_code: inviteCode,
          require_buyin_confirmation: requireBuyinConfirmation,
          status: "open",
        })
        .select()
        .single();

      if (poolError) throw poolError;

      // Copy invite link to clipboard
      const inviteUrl = `${window.location.origin}/join?code=${inviteCode}`;
      try {
        await navigator.clipboard.writeText(inviteUrl);
      } catch {
        // Clipboard not available in all contexts
      }

      router.push(`/pool/${pool.id}/manage`);
    } catch (err) {
      console.error("Pool creation error:", err);
      setError(err instanceof Error ? err.message : JSON.stringify(err));
      setLoading(false);
    }
  }

  const scoringOptions: Array<{ value: ScoringMethod; label: string; desc: string }> = [
    { value: "best_3_of_5", label: "Best 3 of 5", desc: "Low 3 player scores each day. Classic format." },
    { value: "all_5", label: "All 5 Scores", desc: "Every pick counts. Higher variance." },
    { value: "best_4_of_5", label: "Best 4 of 5", desc: "Drop your worst. Balanced risk." },
  ];

  return (
    <>
      <NavBar />
      <div style={{ padding: "24px" }}>
        <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: 800, color: "var(--cream)", marginBottom: 4 }}>
          Create a Pool
        </h1>
        <p style={{ fontSize: "var(--text-base)", color: "var(--text-muted)", marginBottom: 24 }}>
          Set up your tournament pool in a few steps
        </p>

        <StepIndicator current={step} />

        {/* ---- STEP 1: Tournament ---- */}
        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 10 }}>
                Select Tournament
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {tournaments.length === 0 && (
                  <p style={{ color: "var(--text-dim)", fontSize: "var(--text-base)" }}>No upcoming tournaments found.</p>
                )}
                {tournaments.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTournament(t.id)}
                    className="selection-row"
                    style={{
                      width: "100%",
                      textAlign: "left",
                      border: selectedTournament === t.id ? "1.5px solid var(--green)" : "1.5px solid var(--border)",
                      background: selectedTournament === t.id ? "rgba(40,94,58,0.08)" : "var(--card)",
                    }}
                  >
                    <div
                      style={{
                        width: 20, height: 20, borderRadius: "50%", border: `2px solid ${selectedTournament === t.id ? "var(--green)" : "var(--text-dim)"}`,
                        background: selectedTournament === t.id ? "var(--green)" : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                        fontSize: 12, color: "white",
                      }}
                    >
                      {selectedTournament === t.id && "✓"}
                    </div>
                    <div>
                      <div style={{ fontSize: "var(--text-md)", fontWeight: 600, color: "var(--cream)" }}>{t.name}</div>
                      <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
                        {t.course} · {new Date(t.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}–{new Date(t.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>
                Pool Name
              </label>
              <input
                type="text"
                value={poolName}
                onChange={(e) => setPoolName(e.target.value)}
                placeholder="My Tournament Pool"
                className="input"
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>
                  <ChipIcon size={12} /> Buy-in (tokens)
                </label>
                <input
                  type="number"
                  value={buyIn}
                  onChange={(e) => setBuyIn(Number(e.target.value))}
                  min={1}
                  inputMode="numeric"
                  className="input"
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>
                  Max Entries
                </label>
                <input
                  type="number"
                  value={maxEntries}
                  onChange={(e) => setMaxEntries(Number(e.target.value))}
                  min={2}
                  inputMode="numeric"
                  className="input"
                />
              </div>
            </div>

            <button
              className="btn-primary"
              style={{ width: "100%" }}
              disabled={!selectedTournament || !poolName}
              onClick={() => setStep(2)}
            >
              Continue → Rules
            </button>
          </div>
        )}

        {/* ---- STEP 2: Rules ---- */}
        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 10 }}>
                Number of Tiers
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                {[3, 4, 5, 6].map((n) => (
                  <button
                    key={n}
                    onClick={() => setNumTiers(n)}
                    style={{
                      flex: 1,
                      padding: "10px 0",
                      borderRadius: "var(--radius-xl)",
                      border: numTiers === n ? "1.5px solid var(--green)" : "1.5px solid var(--border)",
                      background: numTiers === n ? "rgba(40,94,58,0.08)" : "var(--card)",
                      color: numTiers === n ? "var(--cream)" : "var(--text-muted)",
                      fontWeight: 700,
                      fontSize: "var(--text-md)",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 10 }}>
                Scoring Method
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {scoringOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setScoringMethod(opt.value)}
                    className="selection-row"
                    style={{
                      width: "100%",
                      textAlign: "left",
                      border: scoringMethod === opt.value ? "1.5px solid var(--green)" : "1.5px solid var(--border)",
                      background: scoringMethod === opt.value ? "rgba(40,94,58,0.08)" : "var(--card)",
                    }}
                  >
                    <div
                      style={{
                        width: 20, height: 20, borderRadius: "50%",
                        border: `2px solid ${scoringMethod === opt.value ? "var(--green)" : "var(--text-dim)"}`,
                        background: scoringMethod === opt.value ? "var(--green)" : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0, fontSize: 12, color: "white",
                      }}
                    >
                      {scoringMethod === opt.value && "✓"}
                    </div>
                    <div>
                      <div style={{ fontSize: "var(--text-md)", fontWeight: 600, color: "var(--cream)" }}>{opt.label}</div>
                      <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>{opt.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                padding: "12px 14px",
                fontSize: "var(--text-sm)",
                color: "var(--text-muted)",
              }}
            >
              <span style={{ fontWeight: 600, color: "var(--cream)" }}>Cut rule: </span>
              Need 3+ players to make the cut for R3/R4 &amp; overall eligibility.
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setStep(1)}>
                Back
              </button>
              <button className="btn-primary" style={{ flex: 2 }} onClick={() => setStep(3)}>
                Continue → Payouts
              </button>
            </div>
          </div>
        )}

        {/* ---- STEP 3: Payouts ---- */}
        {step === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Payout structure */}
            <div className="card">
              <h3 style={{ fontSize: "var(--text-md)", fontWeight: 700, color: "var(--cream)", marginBottom: 14 }}>
                Payout Structure
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {["Round 1", "Round 2", "Round 3", "Round 4"].map((r) => (
                  <div
                    key={r}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "10px 0",
                      borderBottom: "1px solid var(--border)",
                      fontSize: "var(--text-base)",
                    }}
                  >
                    <span style={{ color: "var(--text-muted)" }}>{r}</span>
                    <span style={{ color: "var(--text)", fontWeight: 500 }}>20% of pot · 50/35/15 split</span>
                  </div>
                ))}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "12px 0 0",
                    borderTop: "1px solid rgba(138,96,48,0.2)",
                  }}
                >
                  <span style={{ color: "var(--gold)", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                    <ChipIcon size={13} color="var(--gold)" /> Overall Winner
                  </span>
                  <span style={{ color: "var(--gold)", fontWeight: 700 }}>20% of pot</span>
                </div>
              </div>
            </div>

            {/* Token disclaimer */}
            <div className="token-disclaimer">
              <ChipIcon size={16} color="var(--chip)" />
              <div>
                <span style={{ fontWeight: 700, color: "var(--chip)", fontSize: "var(--text-sm)" }}>
                  Tokens are for tracking only.
                </span>
                <span style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
                  {" "}Pool members settle up among themselves — Hosel doesn&apos;t handle real money.
                </span>
              </div>
            </div>

            {/* Entry deadline */}
            <div>
              <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>
                Entry Deadline
              </label>
              <input
                type="datetime-local"
                value={entryDeadline}
                onChange={(e) => setEntryDeadline(e.target.value)}
                className="input"
              />
            </div>

            {/* Buy-in confirmation toggle */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "14px 16px",
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
              }}
            >
              <div>
                <div style={{ fontSize: "var(--text-md)", fontWeight: 600, color: "var(--cream)" }}>
                  Require buy-in confirmation
                </div>
                <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
                  Manually confirm each player&apos;s payment before their picks go live
                </div>
              </div>
              <button
                onClick={() => setRequireBuyinConfirmation(!requireBuyinConfirmation)}
                style={{
                  width: 44,
                  height: 24,
                  borderRadius: 12,
                  background: requireBuyinConfirmation ? "var(--green)" : "var(--border)",
                  border: "none",
                  cursor: "pointer",
                  position: "relative",
                  transition: "background 0.2s",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: 2,
                    left: requireBuyinConfirmation ? 22 : 2,
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: "white",
                    transition: "left 0.2s",
                  }}
                />
              </button>
            </div>

            {error && (
              <p style={{ fontSize: "var(--text-sm)", color: "var(--red)" }}>{error}</p>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setStep(2)}>
                Back
              </button>
              <button
                className="btn-gold"
                style={{ flex: 2 }}
                disabled={loading || !entryDeadline}
                onClick={handleSubmit}
              >
                {loading ? "Creating…" : "Launch Pool & Copy Invite Link"}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
