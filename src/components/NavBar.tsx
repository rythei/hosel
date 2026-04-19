"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HoselLogo } from "./HoselLogo";

interface NavBarProps {
  poolName?: string;
  isAdmin?: boolean;
  user?: { display_name: string; avatar_initials: string } | null;
}

export function NavBar({ poolName, isAdmin, user }: NavBarProps) {
  const pathname = usePathname();

  const navLinks = [
    { href: "/", label: "Pools" },
    { href: "#leaderboard", label: "Board" },
    { href: "#picks", label: "Picks" },
  ];

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        background: "rgba(19, 28, 23, 0.8)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border)",
        padding: "14px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      {/* Left: Logo + wordmark */}
      <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
        <HoselLogo size={22} />
        <span style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
          <span style={{ fontWeight: 700, fontSize: 17, color: "var(--cream)" }}>
            {poolName ?? "hosel"}
          </span>
          {!poolName && (
            <span style={{ fontWeight: 400, fontSize: 12, color: "var(--text-dim)" }}>
              .io
            </span>
          )}
        </span>
        {isAdmin && (
          <span
            className="badge"
            style={{
              background: "rgba(45,138,84,0.15)",
              color: "var(--green-light)",
              border: "1px solid rgba(45,138,84,0.3)",
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
          const isActive = link.href === "/" ? pathname === "/" : pathname.includes(link.href.replace("#", ""));
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

      {/* Right: User avatar */}
      {user ? (
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
            {user.avatar_initials || user.display_name.slice(0, 2).toUpperCase()}
          </div>
        </Link>
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
