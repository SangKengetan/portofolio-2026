import type { Express } from "express";
import swaggerUi from "swagger-ui-express";
import { buildOpenApi } from "./openapi";

/** GET /openapi.json and the interactive Swagger UI at /docs. */
export function mountDocs(app: Express) {
  const spec = buildOpenApi();
  app.get("/openapi.json", (_req, res) => {
    res.json(spec);
  });
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(spec, { customSiteTitle: "Portfolio API" }));
}
