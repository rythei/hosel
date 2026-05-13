"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { HoselLogo } from "@/components/HoselLogo";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push(next);
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
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <HoselLogo size={36} />
            <span style={{ fontWeight: 800, fontSize: 28, color: "var(--cream)" }}>hosel</span>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "var(--text-base)" }}>
            Sign in to your account
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label
              htmlFor="email"
              style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="input"
            />
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
              <label
                htmlFor="password"
                style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-muted)" }}
              >
                Password
              </label>
              <Link href="/auth/reset-password" style={{ fontSize: "var(--text-xs)", color: "var(--text-dim)", textDecoration: "none" }}>
                Forgot password?
              </Link>
            </div>
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

          {error && (
            <p style={{ fontSize: "var(--text-sm)", color: "var(--red)" }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ width: "100%", marginTop: 4 }}
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: "var(--text-base)", color: "var(--text-muted)" }}>
          Don&apos;t have an account?{" "}
          <Link href={`/auth/signup${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`} style={{ color: "var(--green-light)", textDecoration: "none", fontWeight: 600 }}>
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
