import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import { renderHeatmapPdf } from "../heatmap-pdf.js";
import { renderHeatmapPng } from "../heatmap-png.js";
import { buildHeatmapSvg } from "../heatmap-svg.js";
import { HeatmapRequestSchema } from "../schemas.js";

export const heatmapRouter = new OpenAPIHono();

const generateRoute = createRoute({
  method: "post",
  path: "/generate",
  request: {
    body: {
      content: { "application/json": { schema: HeatmapRequestSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: {
        "image/svg+xml": { schema: z.string().describe("Vector SVG — default") },
        "image/png": { schema: z.string().describe("3× raster PNG via Sharp") },
        "application/pdf": {
          schema: z.string().describe("A4 PDF with 300 DPI raster figure (Sharp + pdf-lib)"),
        },
      },
      description:
        "Contribution heatmap. Choose format via the Accept header: " +
        "image/svg+xml (default) | image/png | application/pdf",
    },
    500: {
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
      description: "Rendering failed",
    },
  },
});

heatmapRouter.openapi(generateRoute, async (c) => {
  const { authors } = c.req.valid("json");
  const accept = c.req.header("accept") ?? "";

  try {
    if (accept.includes("application/pdf")) {
      const pdf = await renderHeatmapPdf(authors);
      return new Response(pdf, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": 'attachment; filename="credit-heatmap.pdf"',
        },
      });
    }

    if (accept.includes("image/png")) {
      const png = await renderHeatmapPng(authors);
      return new Response(png, {
        headers: {
          "Content-Type": "image/png",
          "Content-Disposition": 'attachment; filename="credit-heatmap.png"',
        },
      });
    }

    // Default: SVG
    const svg = buildHeatmapSvg(authors);
    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Content-Disposition": 'attachment; filename="credit-heatmap.svg"',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: `Rendering failed: ${message}` }, 500);
  }
});
