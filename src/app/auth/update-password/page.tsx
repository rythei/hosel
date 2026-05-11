"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { HoselLogo } from "@/components/HoselLogo";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "linear-gradient(180deg, var(--surface) 0%, var(--bg) 100%)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 360 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <HoselLogo size={36} />
            <span style={{ fontWeight: 800, fontSize: 28, color: "var(--cream)" }}>hosel</span>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "var(--text-base)" }}>
            Choose a new password
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label
              htmlFor="password"
              style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}
            >
              New Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="input"
            />
          </div>

          <div>
            <label
              htmlFor="confirm"
              style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}
            >
              Confirm Password
            </label>
            <input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              required
              className="input"
            />
          </div>

          {error && (
            <p style={{ fontSize: "var(--text-sm)", color: "var(--red)" }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ width: "100%", marginTop: 4 }}
          >
            {loading ? "Saving…" : "Set New Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
