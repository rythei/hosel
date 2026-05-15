"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { HoselLogo, ChipIcon } from "./HoselLogo";

interface NavBarProps {
  poolName?: string;
  poolId?: string;
  poolStatus?: string;
  isAdmin?: boolean;
}

export function NavBar({ poolName, poolId, poolStatus, isAdmin }: NavBarProps) {
  const pathname = usePathname();
  const [user, setUser] = useState<{ display_name: string; avatar_initials: string; token_balance: number } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (!authUser) return;
      supabase
        .from("users")
        .select("display_name, avatar_initials, token_balance")
        .eq("id", authUser.id)
        .single()
        .then(({ data }) => { if (data) setUser(data); });
    });
  }, []);

  const picksOpen = poolStatus === "open";
  const navLinks = poolId
    ? [
        { href: "/", label: "Pools" },
        { href: `/pool/${poolId}/leaderboard`, label: "Board" },
        ...(picksOpen ? [{ href: `/pool/${poolId}/pick`, label: "Picks" }] : []),
      ]
    : [
        { href: "/", label: "Pools" },
        { href: "/how-it-works", label: "Guide" },
      ];

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        background: "var(--nav-bg)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border)",
        padding: "14px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      {/* Left: Logo */}
      <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
        <HoselLogo size={52} />
        {isAdmin && (
          <span
            className="badge"
            style={{
              background: "rgba(40,94,58,0.15)",
              color: "var(--green-light)",
              border: "1px solid rgba(40,94,58,0.3)",
              fontSize: 10,
            }}
          >
            Admin
          </span>
        )}
      </Link>

      {/* Center: Nav buttons */}
      <div style={{ display: "flex", gap: 4 }}>
        {navLinks.map((link) => {
          const isActive = link.href === "/" ? pathname === "/" : pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              style={{
                padding: "6px 12px",
                borderRadius: "var(--radius-md)",
                fontSize: "var(--text-base)",
                fontWeight: 500,
                color: isActive ? "var(--cream)" : "var(--text-muted)",
                background: isActive ? "var(--card)" : "transparent",
                textDecoration: "none",
                transition: "all 0.15s ease",
              }}
            >
              {link.label}
            </Link>
          );
        })}
      </div>

      {/* Right: Token balance + avatar */}
      {user ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link href="/account" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 5, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 99, padding: "4px 10px 4px 8px" }}>
            <ChipIcon size={14} color="var(--chip)" />
            <span style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--chip)", fontFamily: "monospace" }}>
              {(user.token_balance ?? 0).toLocaleString()}
            </span>
          </Link>
          <Link href="/account" style={{ textDecoration: "none" }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: "linear-gradient(135deg, var(--green), var(--green-dark))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
                color: "white",
                cursor: "pointer",
              }}
            >
              {user.avatar_initials || (() => { const p = user.display_name.trim().split(/\s+/); return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : user.display_name.slice(0, 2).toUpperCase(); })()}
            </div>
          </Link>
        </div>
      ) : (
        <Link
          href="/auth/login"
          style={{
            fontSize: "var(--text-sm)",
            color: "var(--text-muted)",
            textDecoration: "none",
          }}
        >
          Sign in
        </Link>
      )}
    </nav>
  );
}
