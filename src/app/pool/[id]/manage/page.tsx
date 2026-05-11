"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { TokenAmount } from "@/components/HoselLogo";
import { createClient } from "@/lib/supabase/client";
import type { Pool, PoolEntry, User } from "@/types";

interface EntryWithUser extends PoolEntry {
  user: User;
}

export default function ManagePoolPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [poolId, setPoolId] = useState<string>("");
  const [pool, setPool] = useState<Pool & { tournament: { name: string; course: string; start_date: string } } | null>(null);
  const [entries, setEntries] = useState<EntryWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [authUserId, setAuthUserId] = useState<string>("");
  const [inviteCopied, setInviteCopied] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [archiveConfirm, setArchiveConfirm] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");

  const loadData = useCallback(async (id: string) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }
    setAuthUserId(user.id);

    const { data: poolData } = await supabase
      .from("pools")
      .select("*, tournament:tournaments(name, course, start_date)")
      .eq("id", id)
      .single();

    if (!poolData || poolData.organizer_id !== user.id) {
      router.push("/");
      return;
    }

    setPool(poolData);

    const { data: entryData } = await supabase
      .from("pool_entries")
      .select("*, user:users(id, display_name, avatar_initials, email, created_at)")
      .eq("pool_id", id)
      .order("created_at", { ascending: true });

    setEntries((entryData ?? []) as EntryWithUser[]);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    params.then(({ id }) => {
      setPoolId(id);
      loadData(id);
    });
  }, [params, loadData]);

  async function togglePublic() {
    if (!pool) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("pools")
      .update({ is_public: !pool.is_public })
      .eq("id", poolId)
      .select()
      .single();
    if (data) setPool((prev) => prev ? { ...prev, is_public: data.is_public } : prev);
  }

  async function toggleBuyinConfirmation() {
    if (!pool) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("pools")
      .update({ require_buyin_confirmation: !pool.require_buyin_confirmation })
      .eq("id", poolId)
      .select()
      .single();
    if (data) setPool((prev) => prev ? { ...prev, require_buyin_confirmation: data.require_buyin_confirmation } : prev);
  }

  async function confirmBuyin(entryId: string) {
    const supabase = createClient();
    await supabase
      .from("pool_entries")
      .update({ buyin_status: "confirmed" })
      .eq("id", entryId);
    setEntries((prev) =>
      prev.map((e) => e.id === entryId ? { ...e, buyin_status: "confirmed" } : e)
    );
  }

  async function copyInviteLink() {
    if (!pool) return;
    const url = `${window.location.origin}/join?code=${pool.invite_code}`;
    await navigator.clipboard.writeText(url);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2000);
  }

  async function lockPool() {
    const supabase = createClient();
    const { data } = await supabase
      .from("pools")
      .update({ status: "locked" })
      .eq("id", poolId)
      .select()
      .single();
    if (data) setPool((prev) => prev ? { ...prev, status: data.status } : prev);
  }

  async function unlockPool() {
    const supabase = createClient();
    const { data } = await supabase
      .from("pools")
      .update({ status: "open" })
      .eq("id", poolId)
      .select()
      .single();
    if (data) setPool((prev) => prev ? { ...prev, status: data.status } : prev);
  }

  async function saveName() {
    if (!nameInput.trim()) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("pools")
      .update({ name: nameInput.trim() })
      .eq("id", poolId)
      .select()
      .single();
    if (data) setPool((prev) => prev ? { ...prev, name: data.name } : prev);
    setEditingName(false);
  }

  async function cancelPool() {
    const supabase = createClient();
    await supabase.from("pools").update({ status: "settled" }).eq("id", poolId);
    router.push("/");
  }

  async function archivePool() {
    const supabase = createClient();
    await supabase.from("pools").update({ status: "archived" }).eq("id", poolId);
    router.push("/");
  }

  if (loading || !pool) {
    return (
      <>
        <NavBar isAdmin />
        <div style={{ padding: 24 }}>
          <div className="skeleton" style={{ height: 20, width: "60%", marginBottom: 12 }} />
          <div className="skeleton" style={{ height: 80, marginBottom: 12 }} />
          <div className="skeleton" style={{ height: 120 }} />
        </div>
      </>
    );
  }

  const confirmedEntries = entries.filter((e) => e.buyin_status === "confirmed");
  const totalPot = pool.buy_in * confirmedEntries.length;
  const deadline = new Date(pool.entry_deadline);
  const deadlinePassed = deadline < new Date();

  return (
    <>
      <NavBar poolName={pool.name} poolId={poolId} isAdmin />
      <div style={{ padding: "24px 24px 48px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          {editingName ? (
            <>
              <input
                className="input"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }}
                style={{ fontSize: "var(--text-xl)", fontWeight: 800, flex: 1 }}
                autoFocus
              />
              <button className="btn-primary" style={{ fontSize: "var(--text-sm)", padding: "8px 14px" }} onClick={saveName}>Save</button>
              <button className="btn-secondary" style={{ fontSize: "var(--text-sm)", padding: "8px 14px" }} onClick={() => setEditingName(false)}>Cancel</button>
            </>
          ) : (
            <>
              <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: 800, color: "var(--cream)", flex: 1 }}>
                {pool.name}
              </h1>
              <button
                onClick={() => { setNameInput(pool.name); setEditingName(true); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-dim)", fontSize: "var(--text-sm)", padding: "4px 8px" }}
              >
                Rename
              </button>
            </>
          )}
        </div>

        {/* Pool Status Card */}
        <div className="card" style={{ marginBottom: 20, position: "relative", overflow: "hidden" }}>
          <div
            style={{
              position: "absolute", top: 0, left: 0, right: 0, height: 2,
              background: "linear-gradient(90deg, var(--green), var(--green-light))",
            }}
          />
          <div style={{ marginBottom: 12 }}>
            <span
              className="badge"
              style={{
                background: "rgba(40,94,58,0.15)",
                color: "var(--green-light)",
                border: "1px solid rgba(40,94,58,0.3)",
              }}
            >
              {pool.status}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              ["Tournament", pool.tournament.name],
              ["Entries", `${entries.length} / ${pool.max_entries}`],
              ["Confirmed", `${confirmedEntries.length} paid`],
              ["Total Pot", <TokenAmount key="pot" amount={totalPot} />],
              ["Deadline", deadlinePassed ? "Picks locked" : deadline.toLocaleString()],
            ].map(([label, value]) => (
              <div key={String(label)} style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-base)" }}>
                <span style={{ color: "var(--text-muted)" }}>{label}</span>
                <span style={{ color: "var(--cream)", fontWeight: 500 }}>{value}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
            <button className="btn-secondary" style={{ flex: 1, fontSize: "var(--text-sm)", padding: "8px 12px" }} onClick={copyInviteLink}>
              {inviteCopied ? "✓ Copied!" : "Copy Invite Link"}
            </button>
            <div
              style={{
                flex: 1,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                padding: "8px 12px",
                textAlign: "center",
                fontFamily: "monospace",
                fontSize: "var(--text-lg)",
                fontWeight: 700,
                color: "var(--cream)",
                letterSpacing: 3,
              }}
            >
              {pool.invite_code}
            </div>
          </div>

          {pool.status === "open" && (
            <div style={{ marginTop: 12 }}>
              <button
                className="btn-primary"
                style={{ width: "100%" }}
                onClick={lockPool}
              >
                Lock Picks
              </button>
              <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", textAlign: "center", marginTop: 6 }}>
                Prevents players from editing picks. Do this before the tournament starts.
              </p>
            </div>
          )}

          {pool.status === "locked" && (
            <div style={{ marginTop: 12 }}>
              <div
                style={{
                  background: "rgba(138,96,48,0.08)",
                  border: "1px solid rgba(138,96,48,0.2)",
                  borderRadius: "var(--radius-lg)",
                  padding: "10px 14px",
                  fontSize: "var(--text-sm)",
                  color: "var(--gold)",
                  textAlign: "center",
                  marginBottom: 8,
                }}
              >
                Picks are locked — no further changes allowed.
              </div>
              <button
                className="btn-secondary"
                style={{ width: "100%", fontSize: "var(--text-sm)" }}
                onClick={unlockPool}
              >
                Unlock Picks
              </button>
              <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", textAlign: "center", marginTop: 6 }}>
                Re-opens the pool so players can edit their picks.
              </p>
            </div>
          )}
        </div>

        {/* Entry Management */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h2 style={{ fontSize: "var(--text-xl)", fontWeight: 700, color: "var(--cream)" }}>
              Entries ({entries.length})
            </h2>
            {/* Toggles */}
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>Public</span>
                <button
                  onClick={togglePublic}
                  style={{ width: 36, height: 20, borderRadius: 10, background: pool.is_public ? "var(--green)" : "var(--border)", border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}
                >
                  <span style={{ position: "absolute", top: 2, left: pool.is_public ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "white", transition: "left 0.2s" }} />
                </button>
              </div>
            {/* Buy-in confirmation toggle */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>Require buy-in</span>
              <button
                onClick={toggleBuyinConfirmation}
                style={{
                  width: 36,
                  height: 20,
                  borderRadius: 10,
                  background: pool.require_buyin_confirmation ? "var(--green)" : "var(--border)",
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
                    left: pool.require_buyin_confirmation ? 18 : 2,
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: "white",
                    transition: "left 0.2s",
                  }}
                />
              </button>
            </div>
          </div>
          </div>

          {entries.length === 0 && (
            <div
              className="card"
              style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)", fontSize: "var(--text-base)" }}
            >
              No entries yet. Share the invite link to get players in.
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {entries.map((entry) => {
              const hasPicks = entry.picks && Object.keys(entry.picks).length > 0;
              const isConfirmed = entry.buyin_status === "confirmed";
              const displayName = entry.user?.display_name ?? "Unknown";
              const initials = entry.user?.avatar_initials ?? "?";
              return (
                <div
                  key={entry.id}
                  className="card"
                  style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}
                >
                  {/* Avatar */}
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, var(--green), var(--green-dark))",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      fontWeight: 700,
                      color: "white",
                      flexShrink: 0,
                    }}
                  >
                    {initials}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "var(--text-md)", fontWeight: 600, color: "var(--cream)" }}>
                      {displayName}
                    </div>
                    <div style={{ fontSize: "var(--text-xs)", color: hasPicks ? "var(--green-light)" : "var(--gold)" }}>
                      {hasPicks ? "✓ Picks submitted" : "No picks yet"}
                    </div>
                  </div>

                  {/* Buy-in status */}
                  {pool.require_buyin_confirmation && (
                    isConfirmed ? (
                      <span
                        className="badge"
                        style={{
                          background: "rgba(52,122,74,0.12)",
                          color: "var(--green-light)",
                          border: "1px solid rgba(52,122,74,0.25)",
                        }}
                      >
                        Paid ✓
                      </span>
                    ) : (
                      <button
                        className="btn-secondary"
                        style={{ fontSize: "var(--text-xs)", padding: "5px 10px" }}
                        onClick={() => confirmBuyin(entry.id)}
                      >
                        Confirm
                      </button>
                    )
                  )}
                  {!pool.require_buyin_confirmation && (
                    <span
                      className="badge"
                      style={{
                        background: "rgba(52,122,74,0.12)",
                        color: "var(--green-light)",
                        border: "1px solid rgba(52,122,74,0.25)",
                      }}
                    >
                      Agreed ✓
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Archive Pool */}
        {(pool.status === "settled" || pool.status === "complete") && (
          <div
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-2xl)",
              padding: 20,
              marginBottom: 16,
            }}
          >
            <h2 style={{ fontSize: "var(--text-md)", fontWeight: 700, color: "var(--text-muted)", marginBottom: 4 }}>
              Archive Pool
            </h2>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--text-dim)", marginBottom: 12 }}>
              Hide this pool from your active list. It won&apos;t be deleted.
            </p>
            {!archiveConfirm ? (
              <button
                className="btn-secondary"
                style={{ fontSize: "var(--text-sm)" }}
                onClick={() => setArchiveConfirm(true)}
              >
                Archive Pool
              </button>
            ) : (
              <div>
                <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginBottom: 12 }}>
                  Are you sure? This pool will be hidden from your home screen.
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn-secondary"
                    style={{ flex: 1, fontSize: "var(--text-sm)" }}
                    onClick={() => setArchiveConfirm(false)}
                  >
                    Never mind
                  </button>
                  <button
                    className="btn-primary"
                    style={{ flex: 1, fontSize: "var(--text-sm)" }}
                    onClick={archivePool}
                  >
                    Yes, Archive
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Danger Zone */}
        {pool.status !== "live" && pool.status !== "complete" && pool.status !== "settled" && pool.status !== "archived" && (
          <div
            style={{
              background: "rgba(217,79,79,0.05)",
              border: "1px solid rgba(217,79,79,0.2)",
              borderRadius: "var(--radius-2xl)",
              padding: 20,
            }}
          >
            <h2 style={{ fontSize: "var(--text-md)", fontWeight: 700, color: "var(--red)", marginBottom: 8 }}>
              Danger Zone
            </h2>
            {!cancelConfirm ? (
              <button
                className="btn-secondary"
                style={{ borderColor: "rgba(217,79,79,0.4)", color: "var(--red)", fontSize: "var(--text-sm)" }}
                onClick={() => setCancelConfirm(true)}
              >
                Cancel Pool
              </button>
            ) : (
              <div>
                <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginBottom: 12 }}>
                  This will cancel the pool and notify all participants. Are you sure?
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn-secondary"
                    style={{ flex: 1, fontSize: "var(--text-sm)" }}
                    onClick={() => setCancelConfirm(false)}
                  >
                    Never mind
                  </button>
                  <button
                    style={{
                      flex: 1,
                      background: "var(--red)",
                      color: "white",
                      border: "none",
                      borderRadius: "var(--radius-lg)",
                      padding: "10px",
                      fontWeight: 700,
                      cursor: "pointer",
                      fontSize: "var(--text-sm)",
                    }}
                    onClick={cancelPool}
                  >
                    Yes, Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
