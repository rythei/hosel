"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Tournament, TournamentPlayer, Pool } from "@/types";

interface Props {
  tournaments: Tournament[];
  playersByTournament: Record<string, TournamentPlayer[]>;
  poolsByTournament: Record<string, Pool[]>;
}

const STATUS_OPTIONS = ["upcoming", "in_progress", "complete"] as const;
const TIER_LABELS = ["Elite", "Contenders", "Dark Horses", "Sleepers", "Longshots", "Field"];
const MAX_TIERS = 6;

const blankTournament: {
  external_id: string;
  name: string;
  course: string;
  start_date: string;
  end_date: string;
  status: Tournament["status"];
  par: string;
} = {
  external_id: "",
  name: "",
  course: "",
  start_date: "",
  end_date: "",
  status: "upcoming",
  par: "72",
};

const blankPlayer = {
  name: "",
  world_ranking: "",
  odds: "",
  tier: "1",
};

interface CsvRow {
  name: string;
  odds: string;
  world_ranking: string;
  tier: number;
  tierExplicit: boolean;
}

function parseOddsToNumber(odds: string): number {
  const n = parseInt(odds.replace(/[^-\d]/g, ""), 10);
  if (isNaN(n)) return 9999;
  // Convert American odds to implied probability for sorting: lower = favorite
  return n < 0 ? n : n;
}

function assignTiers(rows: CsvRow[], numTiers = 5): CsvRow[] {
  // If all rows have explicit tiers, skip auto-assignment entirely
  if (rows.every((r) => r.tierExplicit)) return rows;

  const sorted = [...rows].sort((a, b) => {
    const av = parseOddsToNumber(a.odds);
    const bv = parseOddsToNumber(b.odds);
    if (av < 0 && bv >= 0) return -1;
    if (av >= 0 && bv < 0) return 1;
    return av - bv;
  });
  const chunkSize = Math.ceil(sorted.length / numTiers);
  return sorted.map((row, i) => ({
    ...row,
    tier: row.tierExplicit ? row.tier : Math.min(Math.floor(i / chunkSize) + 1, numTiers),
  }));
}

function parseCsv(text: string): CsvRow[] {
  const lines = text.trim().split(/\r?\n/);
  const header = lines[0].toLowerCase().split(",").map((h) => h.trim());
  const nameIdx = header.findIndex((h) => h.includes("name") || h.includes("player"));
  const oddsIdx = header.findIndex((h) => h.includes("odds"));
  const rankIdx = header.findIndex((h) => h.includes("rank") || h.includes("ranking"));
  const tierIdx = header.findIndex((h) => h === "tier");
  if (nameIdx === -1) return [];
  return lines.slice(1).flatMap((line) => {
    const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const name = cols[nameIdx] ?? "";
    if (!name) return [];
    const explicitTier = tierIdx >= 0 ? parseInt(cols[tierIdx] ?? "") : NaN;
    const tierExplicit = !isNaN(explicitTier) && explicitTier >= 1;
    return [{ name, odds: oddsIdx >= 0 ? (cols[oddsIdx] ?? "") : "", world_ranking: rankIdx >= 0 ? (cols[rankIdx] ?? "") : "", tier: tierExplicit ? explicitTier : 1, tierExplicit }];
  });
}

export function AdminClient({ tournaments: initial, playersByTournament: initialPlayers, poolsByTournament: initialPools }: Props) {
  const router = useRouter();
  const [tournaments, setTournaments] = useState<Tournament[]>(initial);
  const [playersByTournament, setPlayersByTournament] = useState(initialPlayers);
  const [selectedId, setSelectedId] = useState<string | null>(initial[0]?.id ?? null);
  const [showTournamentForm, setShowTournamentForm] = useState(false);
  const [showPlayerForm, setShowPlayerForm] = useState(false);
  const [tournamentForm, setTournamentForm] = useState(blankTournament);
  const [playerForm, setPlayerForm] = useState(blankPlayer);
  const [poolsByTournament, setPoolsByTournament] = useState(initialPools);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [csvPreview, setCsvPreview] = useState<CsvRow[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDeletePoolId, setConfirmDeletePoolId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState("");

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
        par: parseInt(tournamentForm.par) || 72,
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

  // The Vercel cron is disabled on the Hobby plan, so this is currently the only
  // way scores get pulled. Reports matched/unmatched so a tour or name mismatch
  // is visible instead of looking like a successful no-op.
  async function syncScores(tournamentId: string) {
    setSyncing(true);
    setSyncResult("");
    setError("");
    try {
      const res = await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tournamentId }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Sync failed");
        return;
      }

      const result = json.updated?.[0];
      if (!result) {
        setSyncResult(json.message ?? "Nothing to sync");
      } else if (result.error) {
        setError(result.error);
      } else {
        const parNote = result.parUpdated ? ` · par corrected to ${result.detectedPar}` : "";
        const missNote = result.unmatched > 0
          ? ` · ${result.unmatched} ESPN players not in our field (${result.unmatchedSample.join(", ")}${result.unmatched > 5 ? "…" : ""})`
          : "";
        setSyncResult(
          `Synced ${result.matched} of ${result.players} players from ${result.tour} · round ${result.currentRound}${parNote}${missNote}`
        );
        router.refresh();
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setSyncing(false);
    }
  }

  async function updateStatus(tournamentId: string, status: Tournament["status"]) {
    const supabase = createClient();
    await supabase.from("tournaments").update({ status }).eq("id", tournamentId);
    setTournaments((prev) => prev.map((t) => t.id === tournamentId ? { ...t, status } : t));
  }

  async function deleteTournament(tournamentId: string) {
    const supabase = createClient();
    const { error } = await supabase.from("tournaments").delete().eq("id", tournamentId);
    if (error) { setError(error.message); return; }
    const remaining = tournaments.filter((t) => t.id !== tournamentId);
    setTournaments(remaining);
    setSelectedId(remaining[0]?.id ?? null);
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

  async function togglePoolPublic(poolId: string, current: boolean) {
    const supabase = createClient();
    const { data } = await supabase.from("pools").update({ is_public: !current }).eq("id", poolId).select().single();
    if (!data) return;
    setPoolsByTournament((prev) => {
      const next = { ...prev };
      for (const tid of Object.keys(next)) {
        next[tid] = next[tid].map((p) => p.id === poolId ? { ...p, is_public: data.is_public } : p);
      }
      return next;
    });
  }

  async function deletePool(poolId: string) {
    const supabase = createClient();
    const { error } = await supabase.from("pools").delete().eq("id", poolId);
    if (error) { setError(error.message); return; }
    setPoolsByTournament((prev) => {
      const next = { ...prev };
      for (const tid of Object.keys(next)) {
        next[tid] = next[tid].filter((p) => p.id !== poolId);
      }
      return next;
    });
    setConfirmDeletePoolId(null);
  }

  function handleCsvFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseCsv(text);
      if (rows.length === 0) { setError("Could not parse CSV — ensure it has a 'player_name' column."); return; }
      setCsvPreview(assignTiers(rows));
    };
    reader.readAsText(file);
  }

  async function importCsvPlayers() {
    if (!selectedId || !csvPreview) return;
    setImporting(true);
    setError("");
    const supabase = createClient();
    const rows = csvPreview.map((row) => ({
      tournament_id: selectedId,
      name: row.name,
      odds: row.odds || null,
      world_ranking: row.world_ranking ? parseInt(row.world_ranking) : null,
      tier: row.tier,
      status: "active" as const,
    }));
    const { data, error } = await supabase.from("tournament_players").insert(rows).select();
    if (error) { setError(error.message); setImporting(false); return; }
    setPlayersByTournament((prev) => ({
      ...prev,
      [selectedId]: [...(prev[selectedId] ?? []), ...(data as TournamentPlayer[])],
    }));
    setCsvPreview(null);
    setImporting(false);
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

  const numTiersInUse = Math.max(...players.map((p) => p.tier ?? 1), 5);
  const tierGroups = Array.from({ length: numTiersInUse }, (_, i) => i + 1).map((tier) => ({
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

      {syncResult && (
        <div style={{ background: "rgba(52,122,74,0.1)", border: "1px solid rgba(52,122,74,0.3)", borderRadius: "var(--radius-lg)", padding: "10px 14px", marginBottom: 16, color: "var(--green-light)", fontSize: "var(--text-sm)" }}>
          {syncResult}
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
              <p style={{ fontSize: "var(--text-xs)", color: "var(--text-dim)", marginTop: 4 }}>Tour (PGA/LPGA/etc.) is auto-detected at sync time.</p>
            </div>
            <div>
              <label style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 4 }}>COURSE PAR</label>
              <input className="input" type="number" min="68" max="74" placeholder="72" value={tournamentForm.par} onChange={(e) => setTournamentForm((f) => ({ ...f, par: e.target.value }))} />
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
                onClick={() => { setSelectedId(t.id); setConfirmDelete(false); }}
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
                    <p style={{ fontSize: "var(--text-xs)", color: "var(--text-dim)", marginTop: 4, fontFamily: "monospace" }}>
                      ESPN ID: {selected.external_id} · par {selected.par ?? 72}
                    </p>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
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
                  <div style={{ width: 1, height: 20, background: "var(--border)", margin: "0 2px" }} />
                  <button
                    onClick={() => syncScores(selected.id)}
                    disabled={syncing || !selected.external_id}
                    title={selected.external_id ? "Pull scores from ESPN now" : "Add an ESPN event ID first"}
                    style={{
                      fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 99,
                      cursor: syncing || !selected.external_id ? "not-allowed" : "pointer",
                      border: "1px solid var(--border)",
                      background: "var(--surface)",
                      color: selected.external_id ? "var(--green-light)" : "var(--text-dim)",
                      opacity: syncing ? 0.6 : 1,
                      transition: "all 0.15s",
                    }}
                  >
                    {syncing ? "Syncing…" : "↻ Sync scores"}
                  </button>
                  <div style={{ width: 1, height: 20, background: "var(--border)", margin: "0 2px" }} />
                  {!confirmDelete ? (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      style={{
                        fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 99,
                        cursor: "pointer", border: "1px solid rgba(144,64,64,0.3)",
                        background: "rgba(144,64,64,0.06)", color: "var(--red)",
                      }}
                    >
                      Delete
                    </button>
                  ) : (
                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Sure?</span>
                      <button
                        onClick={() => { setConfirmDelete(false); deleteTournament(selected.id); }}
                        style={{
                          fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 99,
                          cursor: "pointer", border: "none",
                          background: "var(--red)", color: "white",
                        }}
                      >
                        Yes, delete
                      </button>
                      <button
                        onClick={() => setConfirmDelete(false)}
                        style={{
                          fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 99,
                          cursor: "pointer", border: "1px solid var(--border)",
                          background: "var(--surface)", color: "var(--text-muted)",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Pools */}
            {(poolsByTournament[selected.id] ?? []).length > 0 && (
              <div className="card" style={{ padding: "14px 18px", marginBottom: 16 }}>
                <div style={{ fontSize: "var(--text-xs)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: 10 }}>
                  Pools ({(poolsByTournament[selected.id] ?? []).length})
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {(poolsByTournament[selected.id] ?? []).map((pool) => (
                    <div key={pool.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "8px 12px" }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--cream)" }}>{pool.name}</span>
                        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginLeft: 8 }}>{pool.status}</span>
                      </div>
                      <button
                        onClick={() => togglePoolPublic(pool.id, pool.is_public)}
                        style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 99, cursor: "pointer", border: `1px solid ${pool.is_public ? "rgba(40,94,58,0.4)" : "var(--border)"}`, background: pool.is_public ? "rgba(40,94,58,0.12)" : "var(--surface)", color: pool.is_public ? "var(--green-light)" : "var(--text-muted)" }}
                      >
                        {pool.is_public ? "Public ✓" : "Private"}
                      </button>
                      {confirmDeletePoolId === pool.id ? (
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Sure?</span>
                          <button
                            onClick={() => deletePool(pool.id)}
                            style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 99, cursor: "pointer", border: "none", background: "var(--red)", color: "white" }}
                          >
                            Yes, delete
                          </button>
                          <button
                            onClick={() => setConfirmDeletePoolId(null)}
                            style={{ fontSize: 11, padding: "3px 8px", borderRadius: 99, cursor: "pointer", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-muted)" }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeletePoolId(pool.id)}
                          style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 99, cursor: "pointer", border: "1px solid rgba(144,64,64,0.3)", background: "rgba(144,64,64,0.06)", color: "var(--red)" }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Players by tier */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: "var(--text-xs)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-dim)" }}>
                Players ({players.length})
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <label
                  style={{
                    fontSize: "var(--text-xs)", padding: "6px 12px", cursor: "pointer",
                    background: "var(--surface)", border: "1px solid var(--border)",
                    borderRadius: "var(--radius-lg)", color: "var(--text-muted)", fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  Import CSV
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    style={{ display: "none" }}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) { setError(""); handleCsvFile(f); } e.target.value = ""; }}
                  />
                </label>
                <button
                  className="btn-secondary"
                  style={{ fontSize: "var(--text-xs)", padding: "6px 12px" }}
                  onClick={() => { setShowPlayerForm((v) => !v); setError(""); }}
                >
                  {showPlayerForm ? "Cancel" : "+ Add Player"}
                </button>
              </div>
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
                      {Array.from({ length: MAX_TIERS }, (_, i) => i + 1).map((n) => <option key={n} value={n}>T{n} — {TIER_LABELS[n - 1]}</option>)}
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

            {/* CSV preview */}
            {csvPreview && (
              <div className="card" style={{ padding: 16, marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div>
                    <span style={{ fontSize: "var(--text-md)", fontWeight: 700, color: "var(--cream)" }}>
                      Import {csvPreview.length} players
                    </span>
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginLeft: 8 }}>
                      Tiers auto-assigned by odds — edit before importing
                    </span>
                  </div>
                  <button
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-dim)", fontSize: 18 }}
                    onClick={() => setCsvPreview(null)}
                  >×</button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 320, overflowY: "auto", marginBottom: 12 }}>
                  {/* Header */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 90px", gap: 8, padding: "0 4px 6px", fontSize: "var(--text-xs)", color: "var(--text-dim)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    <span>Name</span><span>Odds</span><span>Rank</span><span>Tier</span>
                  </div>
                  {csvPreview.map((row, i) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 90px", gap: 8, alignItems: "center", background: "var(--surface)", borderRadius: "var(--radius-md)", padding: "6px 8px" }}>
                      <span style={{ fontSize: "var(--text-sm)", color: "var(--cream)", fontWeight: 500 }}>{row.name}</span>
                      <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontFamily: "monospace" }}>{row.odds || "—"}</span>
                      <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{row.world_ranking || "—"}</span>
                      <select
                        value={row.tier}
                        onChange={(e) => setCsvPreview((prev) => prev ? prev.map((r, j) => j === i ? { ...r, tier: parseInt(e.target.value) } : r) : prev)}
                        style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", color: `var(--tier-${row.tier})`, fontSize: "var(--text-xs)", padding: "3px 6px", cursor: "pointer", fontWeight: 700 }}
                      >
                        {Array.from({ length: MAX_TIERS }, (_, i) => i + 1).map((n) => <option key={n} value={n}>T{n} — {TIER_LABELS[n - 1]}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn-primary" style={{ fontSize: "var(--text-sm)", padding: "8px 16px" }} onClick={importCsvPlayers} disabled={importing}>
                    {importing ? "Importing…" : `Import ${csvPreview.length} Players`}
                  </button>
                  <button className="btn-secondary" style={{ fontSize: "var(--text-sm)", padding: "8px 16px" }} onClick={() => setCsvPreview(null)}>
                    Cancel
                  </button>
                </div>
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
