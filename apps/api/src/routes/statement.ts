import { generateStatement } from "@credit-generator/core";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { StatementRequestSchema, StatementResponseSchema } from "../schemas.js";

export const statementRouter = new OpenAPIHono();

const generateRoute = createRoute({
  method: "post",
  path: "/generate",
  request: {
    body: {
      content: { "application/json": { schema: StatementRequestSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: StatementResponseSchema } },
      description: "Generated CRediT statement",
    },
  },
});

statementRouter.openapi(generateRoute, (c) => {
  const { authors, format, showLevels } = c.req.valid("json");
  const result = generateStatement(authors, { format, showLevels });
  return c.json({ result });
});
