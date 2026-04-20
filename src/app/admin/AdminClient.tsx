"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Tournament, TournamentPlayer } from "@/types";

interface Props {
  tournaments: Tournament[];
  playersByTournament: Record<string, TournamentPlayer[]>;
}

const STATUS_OPTIONS = ["upcoming", "in_progress", "complete"] as const;
const TIER_LABELS = ["Elite", "Contenders", "Dark Horses", "Sleepers", "Longshots"];

const blankTournament: {
  external_id: string;
  name: string;
  course: string;
  start_date: string;
  end_date: string;
  status: Tournament["status"];
} = {
  external_id: "",
  name: "",
  course: "",
  start_date: "",
  end_date: "",
  status: "upcoming",
};

const blankPlayer = {
  name: "",
  world_ranking: "",
  odds: "",
  tier: "1",
};

export function AdminClient({ tournaments: initial, playersByTournament: initialPlayers }: Props) {
  const router = useRouter();
  const [tournaments, setTournaments] = useState<Tournament[]>(initial);
  const [playersByTournament, setPlayersByTournament] = useState(initialPlayers);
  const [selectedId, setSelectedId] = useState<string | null>(initial[0]?.id ?? null);
  const [showTournamentForm, setShowTournamentForm] = useState(false);
  const [showPlayerForm, setShowPlayerForm] = useState(false);
  const [tournamentForm, setTournamentForm] = useState(blankTournament);
  const [playerForm, setPlayerForm] = useState(blankPlayer);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selected = tournaments.find((t) => t.id === selectedId) ?? null;
  const players = selectedId ? (playersByTournament[selectedId] ?? []) : [];

  async function saveTournament() {
    setSaving(true);
    setError("");
    const supabase = createClient();
    const { data, error } = await supabase
      .from("tournaments")
      .insert({
        external_id: tournamentForm.external_id || null,
        name: tournamentForm.name,
        course: tournamentForm.course,
        start_date: tournamentForm.start_date,
        end_date: tournamentForm.end_date,
        status: tournamentForm.status,
        current_round: null,
        cut_line: null,
      })
      .select()
      .single();

    if (error) { setError(error.message); setSaving(false); return; }
    setTournaments((prev) => [data as Tournament, ...prev]);
    setSelectedId(data.id);
    setShowTournamentForm(false);
    setTournamentForm(blankTournament);
    setSaving(false);
  }

  async function updateStatus(tournamentId: string, status: Tournament["status"]) {
    const supabase = createClient();
    await supabase.from("tournaments").update({ status }).eq("id", tournamentId);
    setTournaments((prev) => prev.map((t) => t.id === tournamentId ? { ...t, status } : t));
  }

  async function savePlayer() {
    if (!selectedId) return;
    setSaving(true);
    setError("");
    const supabase = createClient();
    const { data, error } = await supabase
      .from("tournament_players")
      .insert({
        tournament_id: selectedId,
        name: playerForm.name,
        world_ranking: playerForm.world_ranking ? parseInt(playerForm.world_ranking) : null,
        odds: playerForm.odds || null,
        tier: parseInt(playerForm.tier),
        status: "active",
      })
      .select()
      .single();

    if (error) { setError(error.message); setSaving(false); return; }
    setPlayersByTournament((prev) => ({
      ...prev,
      [selectedId]: [...(prev[selectedId] ?? []), data as TournamentPlayer],
    }));
    setPlayerForm({ ...blankPlayer, tier: playerForm.tier });
    setSaving(false);
  }

  async function deletePlayer(playerId: string) {
    if (!selectedId) return;
    const supabase = createClient();
    await supabase.from("tournament_players").delete().eq("id", playerId);
    setPlayersByTournament((prev) => ({
      ...prev,
      [selectedId]: (prev[selectedId] ?? []).filter((p) => p.id !== playerId),
    }));
  }

  async function updatePlayerStatus(playerId: string, status: TournamentPlayer["status"]) {
    if (!selectedId) return;
    const supabase = createClient();
    await supabase.from("tournament_players").update({ status }).eq("id", playerId);
    setPlayersByTournament((prev) => ({
      ...prev,
      [selectedId]: (prev[selectedId] ?? []).map((p) => p.id === playerId ? { ...p, status } : p),
    }));
  }

  const tierGroups = [1, 2, 3, 4, 5].map((tier) => ({
    tier,
    label: TIER_LABELS[tier - 1],
    players: players.filter((p) => p.tier === tier),
  }));

  return (
    <div style={{ padding: "24px 24px 60px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: 800, color: "var(--cream)" }}>Admin</h1>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>Tournament & player management</p>
        </div>
        <button
          className="btn-primary"
          style={{ fontSize: "var(--text-sm)", padding: "8px 16px" }}
          onClick={() => { setShowTournamentForm(true); setError(""); }}
        >
          + Add Tournament
        </button>
      </div>

      {error && (
        <div style={{ background: "rgba(144,64,64,0.1)", border: "1px solid rgba(144,64,64,0.3)", borderRadius: "var(--radius-lg)", padding: "10px 14px", marginBottom: 16, color: "var(--red)", fontSize: "var(--text-sm)" }}>
          {error}
        </div>
      )}

      {/* Add Tournament Form */}
      {showTournamentForm && (
        <div className="card" style={{ marginBottom: 24, padding: 20 }}>
          <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--cream)", marginBottom: 16 }}>New Tournament</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 4 }}>NAME *</label>
              <input className="input" placeholder="PGA Championship" value={tournamentForm.name} onChange={(e) => setTournamentForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 4 }}>COURSE *</label>
              <input className="input" placeholder="Quail Hollow Club" value={tournamentForm.course} onChange={(e) => setTournamentForm((f) => ({ ...f, course: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 4 }}>START DATE *</label>
              <input className="input" type="date" value={tournamentForm.start_date} onChange={(e) => setTournamentForm((f) => ({ ...f, start_date: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 4 }}>END DATE *</label>
              <input className="input" type="date" value={tournamentForm.end_date} onChange={(e) => setTournamentForm((f) => ({ ...f, end_date: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 4 }}>ESPN EVENT ID</label>
              <input className="input" placeholder="401353230 (for score sync)" value={tournamentForm.external_id} onChange={(e) => setTournamentForm((f) => ({ ...f, external_id: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 4 }}>STATUS</label>
              <select className="input" value={tournamentForm.status} onChange={(e) => setTournamentForm((f) => ({ ...f, status: e.target.value as Tournament["status"] }))}>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-primary" style={{ fontSize: "var(--text-sm)", padding: "8px 16px" }} onClick={saveTournament} disabled={saving || !tournamentForm.name || !tournamentForm.start_date}>
              {saving ? "Saving…" : "Save Tournament"}
            </button>
            <button className="btn-secondary" style={{ fontSize: "var(--text-sm)", padding: "8px 16px" }} onClick={() => setShowTournamentForm(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 20, alignItems: "start" }}>
        {/* Tournament list */}
        <div>
          <div style={{ fontSize: "var(--text-xs)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: 10 }}>
            Tournaments ({tournaments.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {tournaments.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                style={{
                  textAlign: "left",
                  background: selectedId === t.id ? "var(--card-hover)" : "var(--card)",
                  border: `1.5px solid ${selectedId === t.id ? "var(--green)" : "var(--border)"}`,
                  borderRadius: "var(--radius-lg)",
                  padding: "10px 12px",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--cream)", marginBottom: 2 }}>{t.name}</div>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{t.start_date}</div>
                <div style={{ marginTop: 4 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 99,
                    background: t.status === "in_progress" ? "rgba(52,122,74,0.15)" : "rgba(0,0,0,0.06)",
                    color: t.status === "in_progress" ? "var(--green-light)" : t.status === "upcoming" ? "var(--gold)" : "var(--text-dim)",
                    border: `1px solid ${t.status === "in_progress" ? "rgba(52,122,74,0.3)" : "var(--border)"}`,
                  }}>
                    {t.status}
                  </span>
                </div>
              </button>
            ))}
            {tournaments.length === 0 && (
              <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", padding: "12px 0" }}>No tournaments yet.</p>
            )}
          </div>
        </div>

        {/* Tournament detail */}
        {selected ? (
          <div>
            {/* Tournament header */}
            <div className="card" style={{ padding: "16px 20px", marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <h2 style={{ fontSize: "var(--text-xl)", fontWeight: 800, color: "var(--cream)", marginBottom: 2 }}>{selected.name}</h2>
                  <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>{selected.course} · {selected.start_date} – {selected.end_date}</p>
                  {selected.external_id && (
                    <p style={{ fontSize: "var(--text-xs)", color: "var(--text-dim)", marginTop: 4, fontFamily: "monospace" }}>ESPN ID: {selected.external_id}</p>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  {STATUS_OPTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => updateStatus(selected.id, s)}
                      style={{
                        fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 99,
                        cursor: "pointer", border: "1px solid var(--border)",
                        background: selected.status === s ? "var(--green)" : "var(--surface)",
                        color: selected.status === s ? "white" : "var(--text-muted)",
                        transition: "all 0.15s",
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Players by tier */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: "var(--text-xs)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-dim)" }}>
                Players ({players.length})
              </div>
              <button
                className="btn-secondary"
                style={{ fontSize: "var(--text-xs)", padding: "6px 12px" }}
                onClick={() => { setShowPlayerForm((v) => !v); setError(""); }}
              >
                {showPlayerForm ? "Cancel" : "+ Add Player"}
              </button>
            </div>

            {/* Add player form */}
            {showPlayerForm && (
              <div className="card" style={{ padding: 16, marginBottom: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 4 }}>NAME *</label>
                    <input className="input" placeholder="Scottie Scheffler" value={playerForm.name} onChange={(e) => setPlayerForm((f) => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div>
                    <label style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 4 }}>TIER *</label>
                    <select className="input" value={playerForm.tier} onChange={(e) => setPlayerForm((f) => ({ ...f, tier: e.target.value }))}>
                      {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>T{n} — {TIER_LABELS[n - 1]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 4 }}>WORLD RANK</label>
                    <input className="input" type="number" placeholder="1" value={playerForm.world_ranking} onChange={(e) => setPlayerForm((f) => ({ ...f, world_ranking: e.target.value }))} />
                  </div>
                  <div>
                    <label style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 4 }}>ODDS</label>
                    <input className="input" placeholder="+450" value={playerForm.odds} onChange={(e) => setPlayerForm((f) => ({ ...f, odds: e.target.value }))} />
                  </div>
                </div>
                <button
                  className="btn-primary"
                  style={{ fontSize: "var(--text-sm)", padding: "8px 16px" }}
                  onClick={savePlayer}
                  disabled={saving || !playerForm.name}
                >
                  {saving ? "Adding…" : "Add Player"}
                </button>
              </div>
            )}

            {/* Tier groups */}
            {tierGroups.map(({ tier, label, players: tierPlayers }) => (
              <div key={tier} style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: "var(--text-xs)", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: `var(--tier-${tier})` }}>
                    Tier {tier} — {label}
                  </span>
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--text-dim)" }}>({tierPlayers.length})</span>
                </div>
                {tierPlayers.length === 0 ? (
                  <p style={{ fontSize: "var(--text-xs)", color: "var(--text-dim)", paddingLeft: 4 }}>No players yet.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {tierPlayers.map((p) => (
                      <div
                        key={p.id}
                        style={{
                          background: "var(--card)", border: "1px solid var(--border)",
                          borderRadius: "var(--radius-lg)", padding: "8px 12px",
                          display: "flex", alignItems: "center", gap: 10,
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--cream)" }}>{p.name}</span>
                          {p.world_ranking && <span style={{ fontSize: "var(--text-xs)", color: "var(--text-dim)", marginLeft: 8 }}>#{p.world_ranking}</span>}
                          {p.odds && <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginLeft: 8, fontFamily: "monospace" }}>{p.odds}</span>}
                        </div>
                        <select
                          value={p.status}
                          onChange={(e) => updatePlayerStatus(p.id, e.target.value as TournamentPlayer["status"])}
                          style={{
                            background: "var(--surface)", border: "1px solid var(--border)",
                            borderRadius: "var(--radius-md)", color: "var(--text-muted)",
                            fontSize: "var(--text-xs)", padding: "3px 6px", cursor: "pointer",
                          }}
                        >
                          <option value="active">Active</option>
                          <option value="cut">Cut</option>
                          <option value="withdrawn">WD</option>
                          <option value="disqualified">DQ</option>
                        </select>
                        <button
                          onClick={() => deletePlayer(p.id)}
                          style={{
                            background: "none", border: "none", cursor: "pointer",
                            color: "var(--text-dim)", fontSize: 16, lineHeight: 1, padding: "0 2px",
                          }}
                          title="Remove player"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)", paddingTop: 8 }}>
            Select a tournament to manage its players.
          </div>
        )}
      </div>
    </div>
  );
}
