import { serve } from "@hono/node-server";
import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono } from "@hono/zod-openapi";
import { heatmapRouter } from "./routes/heatmap.js";
import { statementRouter } from "./routes/statement.js";
import { xmlRouter } from "./routes/xml.js";

const app = new OpenAPIHono();

app.route("/api/v1/statement", statementRouter);
app.route("/api/v1/heatmap", heatmapRouter);
app.route("/api/v1/xml", xmlRouter);

app.doc("/api/openapi.json", {
  openapi: "3.0.0",
  info: { title: "CRediT Generator API", version: "1.0.0" },
});

app.get("/api/docs", swaggerUI({ url: "/api/openapi.json" }));

const port = Number(process.env.PORT ?? 3001);
serve({ fetch: app.fetch, port }, () => {
  console.log(`API running on http://localhost:${port}`);
  console.log(`Swagger UI: http://localhost:${port}/api/docs`);
});

export default app;
