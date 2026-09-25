// Generates public/og.png — the 1200×630 Open Graph share card used by
// Discord/X/iMessage link previews. Run: node scripts/generate-og.mjs
import sharp from "sharp";

const W = 1200;
const H = 630;

// Subtle blueprint grid
let grid = "";
for (let x = 0; x <= W; x += 100)
  grid += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="#ffffff" stroke-opacity="0.035"/>`;
for (let y = 0; y <= H; y += 100)
  grid += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#ffffff" stroke-opacity="0.035"/>`;

const pill = (x, w, label) => `
  <rect x="${x}" y="470" width="${w}" height="72" rx="36" fill="#ffffff" fill-opacity="0.06" stroke="#ffffff" stroke-opacity="0.12"/>
  <text x="${x + w / 2}" y="516" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="bold" fill="#dbeafe">${label}</text>`;

const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#171a2b"/>
      <stop offset="1" stop-color="#0d0e17"/>
    </linearGradient>
    <radialGradient id="glow1" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#3b82f6" stop-opacity="0.5"/>
      <stop offset="1" stop-color="#3b82f6" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow2" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#38bdf8" stop-opacity="0.32"/>
      <stop offset="1" stop-color="#38bdf8" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <circle cx="1030" cy="90" r="430" fill="url(#glow1)"/>
  <circle cx="150" cy="580" r="400" fill="url(#glow2)"/>
  ${grid}
  <text x="600" y="300" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="170" font-weight="bold" letter-spacing="34" fill="#f4f6fb">ZYN</text>
  <text x="600" y="392" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="37" letter-spacing="5" fill="#a5b4fc">Roblox SFX · Sound Design · QA Testing</text>
  ${pill(280, 300, "410M+ game visits")}
  ${pill(620, 300, "40+ games shipped")}
</svg>`;

await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile("public/og.png");
console.log("public/og.png written");
