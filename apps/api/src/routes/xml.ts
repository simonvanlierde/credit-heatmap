import { AuthorSchema, fromXmlDocument, toJats4rXml } from "@credit-generator/core";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { DOMParser } from "linkedom";
import { z } from "zod";

export const xmlRouter = new OpenAPIHono();

// ─── POST /parse ─────────────────────────────────────────────────────────────

const parseRoute = createRoute({
  method: "post",
  path: "/parse",
  request: {
    body: {
      content: {
        "application/xml": {
          schema: z
            .string()
            .describe("JATS4R XML document produced by this tool or compatible software"),
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ authors: z.array(AuthorSchema) }),
        },
      },
      description: "Parsed Author array",
    },
    400: {
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
      description: "Invalid XML or no <contrib> elements found",
    },
  },
});

xmlRouter.openapi(parseRoute, async (c) => {
  const xmlString = await c.req.text();
  try {
    // linkedom accepts "text/xml" (not "application/xml") for its DOMParser
    const doc = new DOMParser().parseFromString(xmlString, "text/xml");
    // linkedom's Document is structurally compatible with the DOM Document interface
    const authors = fromXmlDocument(doc as unknown as Document);
    if (authors.length === 0) {
      return c.json({ error: "No <contrib> elements found in the XML." }, 400 as const);
    }
    return c.json({ authors }, 200 as const);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: `XML parse error: ${message}` }, 400 as const);
  }
});

// ─── POST /export ─────────────────────────────────────────────────────────────

const exportRoute = createRoute({
  method: "post",
  path: "/export",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({ authors: z.array(AuthorSchema).min(1) }),
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: {
        "application/xml": {
          schema: z.string().describe("JATS4R XML — embed directly in a JATS article manuscript"),
        },
      },
      description: "JATS4R XML document",
    },
    500: {
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
      description: "Serialisation failed",
    },
  },
});

xmlRouter.openapi(exportRoute, async (c) => {
  const { authors } = c.req.valid("json");
  try {
    const xml = toJats4rXml(authors);
    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Content-Disposition": 'attachment; filename="credit-contributors.xml"',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: `Serialisation failed: ${message}` }, 500);
  }
});
