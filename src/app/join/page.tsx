"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { TokenAmount } from "@/components/HoselLogo";
import { createClient } from "@/lib/supabase/client";
import type { Pool } from "@/types";
import { Suspense } from "react";

function JoinForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState(searchParams.get("code") ?? "");
  const [pool, setPool] = useState<(Pool & { tournament: { name: string; course: string; start_date: string } }) | null>(null);
  const [lookupError, setLookupError] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");

  async function lookupPool() {
    setLookupError("");
    setPool(null);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("pools")
      .select("*, tournament:tournaments(name, course, start_date)")
      .eq("invite_code", code.toUpperCase().trim())
      .single();

    if (error || !data) {
      setLookupError("Pool not found. Check the code and try again.");
    } else if (data.status !== "open") {
      setLookupError("This pool is no longer accepting entries.");
    } else {
      setPool(data as Pool & { tournament: { name: string; course: string; start_date: string } });
    }
  }

  async function joinPool() {
    if (!pool) return;
    setJoining(true);
    setJoinError("");

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }

      const buyinStatus = pool.require_buyin_confirmation ? "pending" : "confirmed";

      const { error } = await supabase.from("pool_entries").insert({
        pool_id: pool.id,
        user_id: user.id,
        buyin_status: buyinStatus,
      });

      if (error) {
        if (error.code === "23505") {
          router.push(`/pool/${pool.id}/pick`);
          return;
        }
        console.error("Join error:", error);
        setJoinError(`${error.message} (${error.code})`);
        setJoining(false);
      } else {
        router.push(`/pool/${pool.id}/pick`);
      }
    } catch (err) {
      console.error("Join exception:", err);
      setJoinError(err instanceof Error ? err.message : String(err));
      setJoining(false);
    }
  }

  // Auto-lookup if code comes from URL
  useEffect(() => {
    if (searchParams.get("code")) lookupPool();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <NavBar />
      <div style={{ padding: "32px 24px" }}>
        <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: 800, color: "var(--cream)", marginBottom: 4 }}>
          Join a Pool
        </h1>
        <p style={{ fontSize: "var(--text-base)", color: "var(--text-muted)", marginBottom: 24 }}>
          Enter the 6-character pool code from your invite link.
        </p>

        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            maxLength={6}
            className="input"
            style={{ fontFamily: "monospace", fontSize: "var(--text-xl)", letterSpacing: 4, textTransform: "uppercase" }}
          />
          <button
            className="btn-primary"
            onClick={lookupPool}
            disabled={code.length < 6}
            style={{ flexShrink: 0 }}
          >
            Find
          </button>
        </div>

        {lookupError && (
          <p style={{ color: "var(--red)", fontSize: "var(--text-sm)", marginBottom: 16 }}>{lookupError}</p>
        )}

        {pool && (
          <div className="card" style={{ marginTop: 8 }}>
            <h2 style={{ fontSize: "var(--text-xl)", fontWeight: 700, color: "var(--cream)", marginBottom: 4 }}>
              {pool.name}
            </h2>
            <p style={{ fontSize: "var(--text-base)", color: "var(--text-muted)", marginBottom: 16 }}>
              {pool.tournament.name} · {pool.tournament.course}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
              {[
                ["Buy-in", <TokenAmount key="buyin" amount={pool.buy_in} />],
                ["Tiers", `${pool.num_tiers} tiers`],
                ["Scoring", pool.scoring_method.replace(/_/g, " ")],
                ["Max entries", `${pool.max_entries}`],
                ["Deadline", new Date(pool.entry_deadline).toLocaleString()],
              ].map(([label, value]) => (
                <div key={String(label)} style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-base)" }}>
                  <span style={{ color: "var(--text-muted)" }}>{label}</span>
                  <span style={{ color: "var(--cream)", fontWeight: 500 }}>{value}</span>
                </div>
              ))}
            </div>

            <div className="token-disclaimer" style={{ marginBottom: 16 }}>
              <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
                By joining, you agree to a <TokenAmount amount={pool.buy_in} size={12} /> buy-in for this pool. Settle up with your organizer directly.
              </p>
            </div>

            {pool.require_buyin_confirmation && (
              <div
                style={{
                  background: "rgba(201,168,76,0.08)",
                  border: "1px solid rgba(201,168,76,0.2)",
                  borderRadius: "var(--radius-lg)",
                  padding: "10px 14px",
                  marginBottom: 16,
                  fontSize: "var(--text-sm)",
                  color: "var(--gold)",
                }}
              >
                This pool requires buy-in confirmation. Your picks won&apos;t go live until the organizer confirms your payment.
              </div>
            )}

            {joinError && (
              <p style={{ color: "var(--red)", fontSize: "var(--text-sm)", marginBottom: 12 }}>{joinError}</p>
            )}

            <button
              className="btn-primary"
              style={{ width: "100%" }}
              onClick={joinPool}
              disabled={joining}
            >
              {joining ? "Joining…" : `Join Pool & Make Picks`}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

export default function JoinPage() {
  return (
    <Suspense>
      <JoinForm />
    </Suspense>
  );
}
