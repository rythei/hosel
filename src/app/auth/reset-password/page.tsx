"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { HoselLogo } from "@/components/HoselLogo";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSent(true);
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
            Reset your password
          </p>
        </div>

        {sent ? (
          <div style={{ textAlign: "center" }}>
            <p style={{ color: "var(--green-light)", fontWeight: 600, marginBottom: 8 }}>
              Check your email
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)", marginBottom: 24 }}>
              We sent a password reset link to {email}
            </p>
            <Link href="/auth/login" style={{ color: "var(--green-light)", textDecoration: "none", fontWeight: 600, fontSize: "var(--text-sm)" }}>
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
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

              {error && (
                <p style={{ fontSize: "var(--text-sm)", color: "var(--red)" }}>{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{ width: "100%", marginTop: 4 }}
              >
                {loading ? "Sending…" : "Send Reset Link"}
              </button>
            </form>

            <p style={{ textAlign: "center", marginTop: 20, fontSize: "var(--text-base)", color: "var(--text-muted)" }}>
              <Link href="/auth/login" style={{ color: "var(--green-light)", textDecoration: "none", fontWeight: 600 }}>
                Back to sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
