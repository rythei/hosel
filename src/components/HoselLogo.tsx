"use client";

interface HoselLogoProps {
  size?: number;
}

export function HoselLogo({ size = 22 }: HoselLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Club head */}
      <rect x="2" y="18" width="14" height="10" rx="3" fill="var(--green)" />
      {/* Hosel junction */}
      <circle cx="14" cy="18" r="3" fill="var(--green-light)" />
      {/* Shaft */}
      <line
        x1="14"
        y1="15"
        x2="27"
        y2="3"
        stroke="var(--cream)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ChipIcon({
  size = 16,
  color = "var(--chip)",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}
    >
      <circle cx="10" cy="10" r="9" stroke={color} strokeWidth="1.8" fill={color} fillOpacity="0.1" />
      <circle cx="10" cy="10" r="5.5" stroke={color} strokeWidth="1.2" strokeDasharray="2.5 2" />
      <circle cx="10" cy="10" r="2" fill={color} />
    </svg>
  );
}

export function TokenAmount({
  amount,
  color = "var(--chip)",
  size = 13,
}: {
  amount: number;
  color?: string;
  size?: number;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "3px",
        fontWeight: 700,
        color,
        fontVariantNumeric: "tabular-nums",
        fontSize: size,
      }}
    >
      <ChipIcon size={size} color={color} />
      {amount}
    </span>
  );
}
