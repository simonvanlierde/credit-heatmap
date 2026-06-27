import { describe, expect, it } from "vitest";
import type { Author } from "../author.js";
import { CREDIT_ROLES } from "../credit-roles.js";
import { buildHeatmapSvg } from "../export/heatmap-svg.js";
import { createAuthor, parseAuthorText } from "../parse-authors.js";

function authorsWithScores(): Author[] {
  const authors = parseAuthorText("Jane Smith\nBob White");
  const [jane] = authors;
  if (!jane) throw new Error("expected author");
  const lead = jane.contributions[0];
  if (!lead) throw new Error("expected contribution");
  lead.score = 100;
  return authors;
}

describe("buildHeatmapSvg", () => {
  it("produces a self-contained SVG with title, role labels, initials, and legend", () => {
    const svg = buildHeatmapSvg(authorsWithScores());
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg.trimEnd().endsWith("</svg>")).toBe(true);
    expect(svg).toContain("CRediT Contribution Heatmap");
    expect(svg).toContain("Conceptualization");
    expect(svg).toContain(">JS<"); // author initials
    expect(svg).toContain("Lead (67–100)"); // legend
  });

  it("renders one cell per author × role (default 22px cells)", () => {
    const authors = authorsWithScores();
    const svg = buildHeatmapSvg(authors);
    const cells = svg.match(/width="22"/g) ?? [];
    expect(cells).toHaveLength(authors.length * 14);
  });

  it("escapes XML special characters in labels", () => {
    const svg = buildHeatmapSvg(authorsWithScores());
    // The role "Writing – review & editing" must have its ampersand escaped.
    expect(svg).toContain("Writing – review &amp; editing");
    expect(svg).not.toMatch(/review & editing/);
  });

  it("applies an overridden accent colour to lead cells", () => {
    const svg = buildHeatmapSvg(authorsWithScores(), { colorScheme: "#ff0000" });
    expect(svg).toContain('fill="#ff0000"');
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
    expect(cells).toHaveLength(authors.length * 14);
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
