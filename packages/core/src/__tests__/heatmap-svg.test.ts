import { describe, expect, it } from "vitest";
import type { Author } from "../author.js";
import { rolesWithContributions } from "../author.js";
import { makeUiTranslator } from "../credit-i18n/ui-strings.js";
import { CREDIT_ROLES } from "../credit-roles.js";
import { buildHeatmapSvg } from "../export/heatmap-svg.js";
import { createAuthor, parseAuthorText } from "../parse-authors.js";

function setScore(author: Author, role: string, score: number): void {
  const c = author.contributions.find((x) => x.role === role);
  if (!c) throw new Error(`missing role ${role}`);
  c.score = score;
}

function authorsWithScores(): Author[] {
  const authors = parseAuthorText("Jane Smith\nBob White");
  const [jane, bob] = authors;
  if (!jane || !bob) throw new Error("expected 2 authors");
  setScore(jane, "Conceptualization", 100); // lead
  setScore(jane, "Writing – review & editing", 100); // exercises XML escaping
  setScore(bob, "Software", 100);
  return authors;
}

/** Cells = authors × roles that actually have a contributor. */
function expectedCellCount(authors: Author[]): number {
  return authors.length * rolesWithContributions(authors).length;
}

describe("buildHeatmapSvg", () => {
  it("produces a self-contained SVG with title, role labels, initials, and legend", () => {
    const svg = buildHeatmapSvg(authorsWithScores());
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg.trimEnd().endsWith("</svg>")).toBe(true);
    expect(svg).toContain("CRediT Contribution Heatmap");
    expect(svg).toContain("Conceptualization");
    expect(svg).toContain(">JS<"); // author initials
    expect(svg).toContain(">Lead<"); // legend label, no score range
  });

  it("legend drops the meaningless 0–100 score ranges", () => {
    const svg = buildHeatmapSvg(authorsWithScores());
    expect(svg).not.toContain("67–100");
    expect(svg).not.toContain("(1–33)");
  });

  it("renders one cell per author × contributed role (default 22px cells)", () => {
    const authors = authorsWithScores();
    const svg = buildHeatmapSvg(authors);
    const cells = svg.match(/width="22"/g) ?? [];
    expect(cells).toHaveLength(expectedCellCount(authors));
  });

  it("omits roles no one contributed to", () => {
    const svg = buildHeatmapSvg(authorsWithScores());
    // Nobody has Methodology → its label must not appear.
    expect(svg).not.toContain("Methodology");
    // A contributed role does appear.
    expect(svg).toContain("Software");
  });

  it("renders a titled placeholder when there are no contributions", () => {
    const authors = parseAuthorText("Alice Brown");
    const svg = buildHeatmapSvg(authors);
    expect(svg).toContain("No contributions assigned yet.");
    expect(svg.match(/width="22"/g) ?? []).toHaveLength(0);
  });

  it("flat mode (showLevels=false) uses a two-key Contributed/None legend", () => {
    const svg = buildHeatmapSvg(authorsWithScores(), { showLevels: false });
    expect(svg).toContain(">Contributed<");
    expect(svg).not.toContain(">Equal<");
  });

  it("labels the axis with full names when acronyms is false", () => {
    const initialsSvg = buildHeatmapSvg(authorsWithScores());
    const namesSvg = buildHeatmapSvg(authorsWithScores(), { acronyms: false });
    // Default uses initials, not the full name, on the axis.
    expect(initialsSvg).toContain(">JS<");
    // Acronyms off renders the full author name on the axis.
    expect(namesSvg).toContain(">Jane Smith<");
  });

  it("escapes XML special characters in labels", () => {
    const svg = buildHeatmapSvg(authorsWithScores());
    expect(svg).toContain("Writing – review &amp; editing");
    expect(svg).not.toMatch(/review & editing/);
  });

  it("ramps a single accent in monochrome mode (the default)", () => {
    const svg = buildHeatmapSvg(authorsWithScores());
    expect(svg).toContain('fill="#1f4e79"'); // accent lead
    expect(svg).not.toContain('fill="#0072b2"'); // no per-author hue
  });

  it("localizes the title and level legend via translateUi", () => {
    const translateUi = makeUiTranslator({ heatmapTitle: "Carte des contributions", lead: "Principal" });
    const svg = buildHeatmapSvg(authorsWithScores(), { translateUi });
    expect(svg).toContain("Carte des contributions");
    expect(svg).toContain(">Principal<"); // localized legend label
    expect(svg).not.toContain(">Lead<");
  });

  it("ramps the chosen base color to full strength for a lead cell", () => {
    const svg = buildHeatmapSvg(authorsWithScores(), { monoColor: "#404040" });
    expect(svg).toContain('fill="#404040"'); // base color at lead (fraction 1)
  });

  it("scales layout dimensions", () => {
    const svg = buildHeatmapSvg(authorsWithScores(), { scale: 2 });
    expect(svg).toContain('width="44"'); // 22 * 2
  });

  it("transposes axes while preserving the cell count", () => {
    const authors = authorsWithScores();
    const normal = buildHeatmapSvg(authors);
    const transposed = buildHeatmapSvg(authors, { transpose: true });
    expect(transposed).not.toBe(normal);
    const cells = transposed.match(/width="22"/g) ?? [];
    expect(cells).toHaveLength(expectedCellCount(authors));
  });

  it("renders the same cells regardless of contribution array order", () => {
    const canonical = CREDIT_ROLES.map((r) => ({
      role: r.name,
      score: r.name === "Software" ? 100 : 0,
    }));
    const shuffled = [...canonical].reverse();

    const a = buildHeatmapSvg([createAuthor("Jane Smith", { contributions: canonical })]);
    const b = buildHeatmapSvg([createAuthor("Jane Smith", { contributions: shuffled })]);

    expect(b).toBe(a);
  });
});
