"use client";

interface HoselLogoProps {
  size?: number;
}

export function HoselLogo({ size = 22 }: HoselLogoProps) {
  // viewBox is 334×222; scale height to `size`, width proportionally
  const width = Math.round((334 / 222) * size);
  return (
    <svg
      width={width}
      height={size}
      viewBox="0 0 334 222"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="hosel logo"
      style={{ display: "block", flexShrink: 0 }}
    >
      <path
        fill="var(--green)"
        fillRule="evenodd"
        d="M 273 161 L 270 164 L 269 169 L 272 173 L 278 173 L 281 170 L 282 165 L 279 161 Z M 61 163 L 62 168 L 65 168 L 78 152 L 97 134 L 100 136 L 96 147 L 96 154 L 99 157 L 104 157 L 123 146 L 123 151 L 126 155 L 128 156 L 134 155 L 140 150 L 145 141 L 151 139 L 156 140 L 156 142 L 160 146 L 163 147 L 166 151 L 151 162 L 151 166 L 156 166 L 167 160 L 172 155 L 172 153 L 175 149 L 183 147 L 184 153 L 189 157 L 196 157 L 209 151 L 222 140 L 226 141 L 223 147 L 222 156 L 224 161 L 228 165 L 237 169 L 242 170 L 251 169 L 258 163 L 260 159 L 259 155 L 250 155 L 237 159 L 228 158 L 227 153 L 230 143 L 236 131 L 249 110 L 263 91 L 267 82 L 267 78 L 264 79 L 256 92 L 242 110 L 235 121 L 233 126 L 228 132 L 215 143 L 198 152 L 195 152 L 194 153 L 190 152 L 189 147 L 191 145 L 197 144 L 201 142 L 209 135 L 210 131 L 205 127 L 199 128 L 194 131 L 186 139 L 184 143 L 174 148 L 171 148 L 162 141 L 162 139 L 167 134 L 175 130 L 176 132 L 179 130 L 178 125 L 172 125 L 167 127 L 161 131 L 156 136 L 150 138 L 146 137 L 146 134 L 143 130 L 138 128 L 133 129 L 128 133 L 128 136 L 120 143 L 112 148 L 102 151 L 102 148 L 107 136 L 107 131 L 106 129 L 104 128 L 100 128 L 93 132 L 85 139 L 74 151 L 71 150 L 95 102 L 116 67 L 116 65 L 113 65 L 104 74 L 98 83 L 98 85 L 87 104 L 71 136 Z M 134 139 L 139 142 L 132 150 L 129 149 L 129 146 L 132 140 Z M 138 133 L 141 134 L 140 138 L 138 138 L 136 135 Z M 204 134 L 200 138 L 194 138 L 201 132 Z"
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
