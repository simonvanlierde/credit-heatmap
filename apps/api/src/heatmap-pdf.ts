/**
 * PDF heatmap export.
 *
 * Pipeline:
 *   buildHeatmapSvg() → Sharp (3× scale, ~300 DPI) → png buffer
 *   → pdf-lib embeds the PNG centred on an A4 page → PDF bytes
 *
 * Why raster-in-PDF rather than a true vector PDF?
 *   • Sharp's SVG rasteriser produces crisp output and is already in the dep tree.
 *   • Most journals accept 300 DPI raster figures (TIFF/EPS/PDF).
 *   • A true vector PDF would require reimplementing the entire heatmap in a PDF
 *     drawing API (pdfkit primitives) — significant duplication for little gain.
 *   • 3× scale on a typical heatmap (~800 px wide) gives 2400 px, which is
 *     ≥300 DPI even when printed at full A4 width.
 */

import type { Author } from "@credit-generator/core";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { buildHeatmapSvg } from "./heatmap-svg.js";

/** A4 in PDF points (72 pt = 1 inch). */
const A4_W = 595;
const A4_H = 842;
const MARGIN = 40;
const SCALE = 3; // rasterise at 3× → ~300 DPI on a typical figure

export async function renderHeatmapPdf(authors: Author[]): Promise<Buffer> {
  const svg = buildHeatmapSvg(authors);

  // --- parse SVG dimensions from the generated markup ---
  const svgWidth = parseSvgDim(svg, "width") ?? 800;
  const svgHeight = parseSvgDim(svg, "height") ?? 600;

  // --- rasterise ---
  const pngBuffer = await sharp(Buffer.from(svg))
    .resize(svgWidth * SCALE, svgHeight * SCALE, { fit: "fill" })
    .png()
    .toBuffer();

  // --- build PDF ---
  const pdfDoc = await PDFDocument.create();

  pdfDoc.setTitle("CRediT Contribution Heatmap");
  pdfDoc.setProducer("CRediT Generator (pdf-lib + Sharp)");
  pdfDoc.setCreationDate(new Date());

  const pngImage = await pdfDoc.embedPng(pngBuffer);

  // Scale to fit within the printable area, preserving aspect ratio
  const availW = A4_W - MARGIN * 2;
  const availH = A4_H - MARGIN * 2;
  const aspect = svgWidth / svgHeight;

  let drawW = availW;
  let drawH = drawW / aspect;

  if (drawH > availH) {
    drawH = availH;
    drawW = drawH * aspect;
  }

  const page = pdfDoc.addPage([A4_W, A4_H]);
  page.drawImage(pngImage, {
    x: (A4_W - drawW) / 2,
    y: (A4_H - drawH) / 2,
    width: drawW,
    height: drawH,
  });

  return Buffer.from(await pdfDoc.save());
}

function parseSvgDim(svg: string, attr: "width" | "height"): number | null {
  const match = svg.match(new RegExp(`${attr}="(\\d+)"`));
  return match ? Number.parseInt(match[1] ?? "0", 10) : null;
}
