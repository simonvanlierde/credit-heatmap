/**
 * PNG heatmap export via Satori + Sharp.
 *
 * Satori renders a React-element-like object to SVG with embedded fonts,
 * giving pixel-perfect text. Sharp then converts that SVG to PNG.
 *
 * The Inter font is fetched from the Google Fonts CDN on the first request
 * and cached in memory for the lifetime of the process — no build-time
 * download or bundled binary blob needed.
 */

import { CREDIT_ROLES } from "@credit-generator/core";
import type { Author } from "@credit-generator/core";
import satori from "satori";
import sharp from "sharp";

// ── Colours matching heatmap-svg.ts and the UI palette ──────────────────────
const C = {
  empty: "#d1e4ff",
  tertiary: "#94ccff",
  secondary: "#0077b6",
  lead: "#005d90",
  text: "#001d36",
  textDim: "#404850",
  bg: "#f8f9ff",
  border: "#bfc7d1",
} as const;

function scoreToFill(score: number): string {
  if (score === 0) return C.empty;
  if (score <= 33) return C.tertiary;
  if (score <= 66) return C.secondary;
  return C.lead;
}

// ── Font loading (lazy + cached) ─────────────────────────────────────────────

let interFontCache: ArrayBuffer | null = null;

async function getInterFont(): Promise<ArrayBuffer> {
  if (interFontCache) return interFontCache;

  // Inter Regular from the jsDelivr CDN — served as a raw .woff file
  const url = "https://cdn.jsdelivr.net/npm/@fontsource/inter@5/files/inter-latin-400-normal.woff";
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch Inter font: ${res.status} ${res.statusText}`);
  interFontCache = await res.arrayBuffer();
  return interFontCache;
}

// ── Layout constants ─────────────────────────────────────────────────────────
const CELL = 22;
const GAP = 2;
const ROLE_W = 195;
const AUTHOR_H = 110;
const PAD = 24;
const LEGEND_H = 40;

// ── Satori element builders ──────────────────────────────────────────────────
// Satori doesn't use JSX at runtime here — we build plain React-element objects.

type SatoriEl = {
  type: string;
  props: Record<string, unknown>;
};

function box(style: Record<string, unknown>, children?: (SatoriEl | string)[]): SatoriEl {
  return { type: "div", props: { style, children: children ?? [] } };
}

function txt(content: string, style: Record<string, unknown>): SatoriEl {
  return { type: "div", props: { style: { display: "flex", ...style }, children: content } };
}

function buildElement(authors: Author[]): SatoriEl {
  const roles = CREDIT_ROLES;
  const nAuthors = authors.length;
  const nRoles = roles.length;
  const gridW = nAuthors * (CELL + GAP) - GAP;
  const gridH = nRoles * (CELL + GAP) - GAP;
  const totalW = PAD + ROLE_W + GAP * 2 + gridW + PAD;
  const totalH = PAD + AUTHOR_H + GAP * 2 + gridH + PAD + LEGEND_H;

  // Author initials (rotated) — Satori supports transform on individual elements
  const authorLabels: SatoriEl[] = authors.map((a, ai) => ({
    type: "div",
    props: {
      style: {
        position: "absolute",
        left: PAD + ROLE_W + GAP * 2 + ai * (CELL + GAP) + CELL / 2,
        top: PAD + 10,
        width: AUTHOR_H,
        fontSize: 11,
        fontWeight: "500",
        color: C.text,
        transform: "rotate(-45deg)",
        transformOrigin: "0 50%",
        whiteSpace: "nowrap",
      },
      children: a.initials,
    },
  }));

  // Role rows
  const roleRows: SatoriEl[] = roles.map((role, ri) => {
    const y = PAD + AUTHOR_H + GAP * 2 + ri * (CELL + GAP);

    const cells: SatoriEl[] = authors.map((author, ai) => {
      const score = author.contributions[ri]?.score ?? 0;
      return box({
        position: "absolute",
        left: PAD + ROLE_W + GAP * 2 + ai * (CELL + GAP),
        top: y,
        width: CELL,
        height: CELL,
        borderRadius: 3,
        backgroundColor: scoreToFill(score),
      });
    });

    return box({ display: "flex" }, [
      // Role label
      box(
        {
          position: "absolute",
          left: PAD,
          top: y + CELL / 2 - 6,
          width: ROLE_W,
          fontSize: 10.5,
          color: C.textDim,
          textAlign: "right",
        },
        [txt(role.name, { justifyContent: "flex-end" })]
      ),
      ...cells,
    ]);
  });

  // Legend
  const legendItems = [
    { label: "Lead (67–100)", color: C.lead },
    { label: "Secondary (34–66)", color: C.secondary },
    { label: "Tertiary (1–33)", color: C.tertiary },
    { label: "None", color: C.empty },
  ];
  const legendY = totalH - PAD - 14;
  const legend: SatoriEl[] = legendItems.map(({ label, color }, li) =>
    box(
      {
        display: "flex",
        position: "absolute",
        left: PAD + ROLE_W + GAP * 2 + li * 130,
        top: legendY,
        alignItems: "center",
        gap: 6,
      },
      [
        box({ width: 14, height: 14, borderRadius: 2, backgroundColor: color, flexShrink: "0" }),
        txt(label, { fontSize: 10, color: C.textDim }),
      ]
    )
  );

  return box(
    {
      display: "flex",
      position: "relative",
      width: totalW,
      height: totalH,
      backgroundColor: C.bg,
      fontFamily: "Inter",
    },
    [
      // Title
      txt("CRediT Contribution Heatmap", {
        position: "absolute",
        left: PAD,
        top: PAD,
        fontSize: 13,
        fontWeight: "600",
        color: C.text,
      }),
      ...authorLabels,
      ...roleRows,
      ...legend,
    ]
  );
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function renderHeatmapPng(authors: Author[]): Promise<Buffer> {
  const font = await getInterFont();
  const roles = CREDIT_ROLES;
  const nAuthors = authors.length;
  const nRoles = roles.length;
  const gridW = nAuthors * (CELL + GAP) - GAP;
  const gridH = nRoles * (CELL + GAP) - GAP;
  const totalW = PAD + ROLE_W + GAP * 2 + gridW + PAD;
  const totalH = PAD + AUTHOR_H + GAP * 2 + gridH + PAD + LEGEND_H;

  const svg = await satori(buildElement(authors) as Parameters<typeof satori>[0], {
    width: totalW,
    height: totalH,
    fonts: [{ name: "Inter", data: font, weight: 400, style: "normal" }],
  });

  return sharp(Buffer.from(svg)).png().toBuffer();
}
