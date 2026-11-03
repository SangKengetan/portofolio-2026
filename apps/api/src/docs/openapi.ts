import { contactSchema } from "@portfolio/shared";
import type { ZodTypeAny } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { reorderBody } from "../common/validate";
import { achievementBody, adminAchievementsQuery, publicAchievementsQuery } from "../modules/achievements/achievements.schema";
import { changePasswordBody, loginBody } from "../modules/auth/auth.schema";
import { adminCertificatesQuery, certificateBody, publicCertificatesQuery } from "../modules/certificates/certificates.schema";
import { adminExperiencesQuery, experienceBody, publicExperiencesQuery } from "../modules/experiences/experiences.schema";
import { mediaListQuery, updateMediaBody } from "../modules/media/media.schema";
import { messagesQuery, readBody } from "../modules/messages/messages.schema";
import { profileBody } from "../modules/profile/profile.schema";
import { blocksBody, adminProjectsQuery, metricsBody, projectBody, publicProjectsQuery, statusBody } from "../modules/projects/projects.schema";
import { adminTechnologiesQuery, publicTechnologiesQuery, technologyBody } from "../modules/technologies/technologies.schema";

/**
 * OpenAPI 3 document, served at /openapi.json and rendered by Swagger UI at /docs.
 * Request bodies and query strings are generated from the same Zod schemas that validate them,
 * so the documentation cannot drift from the code.
 */

type Method = "get" | "post" | "put" | "patch" | "delete";

interface Operation {
  method: Method;
  path: string; // OpenAPI style: /projects/{slug}
  tag: string;
  summary: string;
  auth?: boolean;
  query?: ZodTypeAny;
  body?: ZodTypeAny | "multipart";
  /** What `data` contains on success. */
  returns?: string;
  status?: number;
}

const json = (schema: ZodTypeAny) => {
  const { $schema: _ignored, ...rest } = zodToJsonSchema(schema, { target: "openApi3", $refStrategy: "none" }) as Record<string, unknown>;
  return rest;
};

const ops: Operation[] = [
  // ---- system
  { method: "get", path: "/health", tag: "System", summary: "Liveness check", returns: "{ status, uptime }" },
  { method: "get", path: "/health/ready", tag: "System", summary: "Readiness check (pings PostgreSQL)", returns: "{ status }" },

  // ---- public
  { method: "get", path: "/v1/profile", tag: "Public", summary: "Profile, socials, photo and CV link", returns: "Profile" },
  { method: "get", path: "/v1/stats", tag: "Public", summary: "Counts for the hero badges", returns: "Stats" },
  { method: "get", path: "/v1/projects", tag: "Public", summary: "Published project cards", query: publicProjectsQuery, returns: "ProjectSummary[]" },
  { method: "get", path: "/v1/projects/{slug}", tag: "Public", summary: "Case study with metrics, blocks, technologies and next project", returns: "ProjectDetail" },
  { method: "get", path: "/v1/experiences", tag: "Public", summary: "Experience cards", query: publicExperiencesQuery, returns: "Experience[]" },
  { method: "get", path: "/v1/technologies", tag: "Public", summary: "Skills & tools", query: publicTechnologiesQuery, returns: "Technology[]" },
  { method: "get", path: "/v1/certificates", tag: "Public", summary: "Certificates", query: publicCertificatesQuery, returns: "Certificate[]" },
  { method: "get", path: "/v1/achievements", tag: "Public", summary: "Achievements timeline", query: publicAchievementsQuery, returns: "Achievement[]" },
  { method: "get", path: "/v1/github/contributions", tag: "Public", summary: "GitHub contribution heatmap (cached 6 h)", returns: "GithubContributions" },
  { method: "post", path: "/v1/contact", tag: "Public", summary: "Send a message (3 per hour per IP; honeypot field `website`)", body: contactSchema, status: 201, returns: "{ received: true }" },

  // ---- auth
  { method: "post", path: "/v1/auth/login", tag: "Auth", summary: "Sign in → sets httpOnly cookies pf_access (15 min) and pf_refresh (7 days)", body: loginBody, returns: "{ user, accessExpiresAt }" },
  { method: "post", path: "/v1/auth/refresh", tag: "Auth", summary: "Rotate the refresh token (needs the pf_refresh cookie)", returns: "{ user, accessExpiresAt }" },
  { method: "post", path: "/v1/auth/logout", tag: "Auth", summary: "Revoke this login and clear cookies" },
  { method: "get", path: "/v1/auth/me", tag: "Auth", summary: "Current admin", auth: true, returns: "{ id, email, name, lastLoginAt }" },
  { method: "post", path: "/v1/auth/change-password", tag: "Auth", summary: "Change password (signs out every device)", auth: true, body: changePasswordBody },

  // ---- admin
  { method: "get", path: "/v1/admin/dashboard", tag: "Admin · Dashboard", summary: "Content counts and unread messages", auth: true },
  { method: "get", path: "/v1/admin/profile", tag: "Admin · Profile", summary: "Read profile", auth: true },
  { method: "put", path: "/v1/admin/profile", tag: "Admin · Profile", summary: "Save profile", auth: true, body: profileBody },

  { method: "get", path: "/v1/admin/projects", tag: "Admin · Projects", summary: "List projects (all statuses)", auth: true, query: adminProjectsQuery },
  { method: "post", path: "/v1/admin/projects", tag: "Admin · Projects", summary: "Create project (slug generated from the title when omitted)", auth: true, body: projectBody, status: 201 },
  { method: "patch", path: "/v1/admin/projects/reorder", tag: "Admin · Projects", summary: "Save drag-and-drop order", auth: true, body: reorderBody },
  { method: "get", path: "/v1/admin/projects/{id}", tag: "Admin · Projects", summary: "Project with blocks (media as ids) and metrics", auth: true },
  { method: "put", path: "/v1/admin/projects/{id}", tag: "Admin · Projects", summary: "Replace project fields and technologies", auth: true, body: projectBody },
  { method: "delete", path: "/v1/admin/projects/{id}", tag: "Admin · Projects", summary: "Soft delete", auth: true },
  { method: "patch", path: "/v1/admin/projects/{id}/status", tag: "Admin · Projects", summary: "Publish / unpublish / archive", auth: true, body: statusBody },
  { method: "put", path: "/v1/admin/projects/{id}/blocks", tag: "Admin · Projects", summary: "Replace all case-study blocks at once", auth: true, body: blocksBody },
  { method: "put", path: "/v1/admin/projects/{id}/metrics", tag: "Admin · Projects", summary: "Replace impact metrics", auth: true, body: metricsBody },

  { method: "get", path: "/v1/admin/experiences", tag: "Admin · Experience", summary: "List", auth: true, query: adminExperiencesQuery },
  { method: "post", path: "/v1/admin/experiences", tag: "Admin · Experience", summary: "Create", auth: true, body: experienceBody, status: 201 },
  { method: "patch", path: "/v1/admin/experiences/reorder", tag: "Admin · Experience", summary: "Reorder", auth: true, body: reorderBody },
  { method: "get", path: "/v1/admin/experiences/{id}", tag: "Admin · Experience", summary: "Detail", auth: true },
  { method: "put", path: "/v1/admin/experiences/{id}", tag: "Admin · Experience", summary: "Update", auth: true, body: experienceBody },
  { method: "delete", path: "/v1/admin/experiences/{id}", tag: "Admin · Experience", summary: "Soft delete", auth: true },

  { method: "get", path: "/v1/admin/certificates", tag: "Admin · Certificates", summary: "List", auth: true, query: adminCertificatesQuery },
  { method: "post", path: "/v1/admin/certificates", tag: "Admin · Certificates", summary: "Create", auth: true, body: certificateBody, status: 201 },
  { method: "patch", path: "/v1/admin/certificates/reorder", tag: "Admin · Certificates", summary: "Reorder", auth: true, body: reorderBody },
  { method: "get", path: "/v1/admin/certificates/{id}", tag: "Admin · Certificates", summary: "Detail", auth: true },
  { method: "put", path: "/v1/admin/certificates/{id}", tag: "Admin · Certificates", summary: "Update", auth: true, body: certificateBody },
  { method: "delete", path: "/v1/admin/certificates/{id}", tag: "Admin · Certificates", summary: "Soft delete", auth: true },

  { method: "get", path: "/v1/admin/achievements", tag: "Admin · Achievements", summary: "List", auth: true, query: adminAchievementsQuery },
  { method: "post", path: "/v1/admin/achievements", tag: "Admin · Achievements", summary: "Create", auth: true, body: achievementBody, status: 201 },
  { method: "patch", path: "/v1/admin/achievements/reorder", tag: "Admin · Achievements", summary: "Reorder", auth: true, body: reorderBody },
  { method: "get", path: "/v1/admin/achievements/{id}", tag: "Admin · Achievements", summary: "Detail", auth: true },
  { method: "put", path: "/v1/admin/achievements/{id}", tag: "Admin · Achievements", summary: "Update", auth: true, body: achievementBody },
  { method: "delete", path: "/v1/admin/achievements/{id}", tag: "Admin · Achievements", summary: "Soft delete", auth: true },

  { method: "get", path: "/v1/admin/technologies", tag: "Admin · Technologies", summary: "List", auth: true, query: adminTechnologiesQuery },
  { method: "post", path: "/v1/admin/technologies", tag: "Admin · Technologies", summary: "Create", auth: true, body: technologyBody, status: 201 },
  { method: "patch", path: "/v1/admin/technologies/reorder", tag: "Admin · Technologies", summary: "Reorder", auth: true, body: reorderBody },
  { method: "get", path: "/v1/admin/technologies/{id}", tag: "Admin · Technologies", summary: "Detail", auth: true },
  { method: "put", path: "/v1/admin/technologies/{id}", tag: "Admin · Technologies", summary: "Update", auth: true, body: technologyBody },
  { method: "delete", path: "/v1/admin/technologies/{id}", tag: "Admin · Technologies", summary: "Delete (removed from projects and experiences too)", auth: true },

  { method: "post", path: "/v1/admin/media", tag: "Admin · Media", summary: "Upload JPG/PNG/WebP/GIF (≤ 8 MB, alt text required) or PDF (≤ 5 MB) → WebP variants sm/md/lg", auth: true, body: "multipart", status: 201 },
  { method: "get", path: "/v1/admin/media", tag: "Admin · Media", summary: "Media library", auth: true, query: mediaListQuery },
  { method: "get", path: "/v1/admin/media/{id}", tag: "Admin · Media", summary: "Detail", auth: true },
  { method: "patch", path: "/v1/admin/media/{id}", tag: "Admin · Media", summary: "Edit alt text", auth: true, body: updateMediaBody },
  { method: "delete", path: "/v1/admin/media/{id}", tag: "Admin · Media", summary: "Delete (409 MEDIA_IN_USE while referenced)", auth: true },

  { method: "get", path: "/v1/admin/messages", tag: "Admin · Messages", summary: "Inbox (header X-Unread-Count)", auth: true, query: messagesQuery },
  { method: "get", path: "/v1/admin/messages/{id}", tag: "Admin · Messages", summary: "Read one message", auth: true },
  { method: "patch", path: "/v1/admin/messages/{id}", tag: "Admin · Messages", summary: "Mark read / unread", auth: true, body: readBody },
  { method: "delete", path: "/v1/admin/messages/{id}", tag: "Admin · Messages", summary: "Delete", auth: true },
];

const errorRef = { $ref: "#/components/schemas/ErrorEnvelope" };

function buildOperation(op: Operation) {
  const parameters: unknown[] = [];
  for (const [, name] of op.path.matchAll(/\{(\w+)\}/g)) {
    parameters.push({ name, in: "path", required: true, schema: { type: "string" } });
  }
  if (op.query) {
    const schema = json(op.query) as { properties?: Record<string, unknown>; required?: string[] };
    for (const [name, prop] of Object.entries(schema.properties ?? {})) {
      parameters.push({ name, in: "query", required: schema.required?.includes(name) ?? false, schema: prop });
    }
  }

  const requestBody =
    op.body === "multipart"
      ? {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["file"],
                properties: {
                  file: { type: "string", format: "binary" },
                  altText: { type: "string", maxLength: 255, description: "Required for images." },
                },
              },
            },
          },
        }
      : op.body
        ? { required: true, content: { "application/json": { schema: json(op.body) } } }
        : undefined;

  const okStatus = String(op.status ?? 200);
  return {
    tags: [op.tag],
    summary: op.summary,
    ...(parameters.length ? { parameters } : {}),
    ...(requestBody ? { requestBody } : {}),
    ...(op.auth ? { security: [{ cookieAuth: [] }] } : {}),
    responses: {
      [okStatus]: {
        description: op.returns ? `Success — \`data\`: ${op.returns}` : "Success",
        content: { "application/json": { schema: { $ref: "#/components/schemas/SuccessEnvelope" } } },
      },
      ...(op.body ? { 422: { description: "Validation failed (`error.fields`)", content: { "application/json": { schema: errorRef } } } } : {}),
      ...(op.auth ? { 401: { description: "Not signed in", content: { "application/json": { schema: errorRef } } } } : {}),
      ...(op.path.includes("{") ? { 404: { description: "Not found", content: { "application/json": { schema: errorRef } } } } : {}),
      429: { description: "Rate limited", content: { "application/json": { schema: errorRef } } },
    },
  };
}

export function buildOpenApi() {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const op of ops) {
    (paths[op.path] ??= {})[op.method] = buildOperation(op);
  }
  return {
    openapi: "3.0.3",
    info: {
      title: "Portfolio API",
      version: "0.1.0",
      description:
        "REST API for the portfolio website and its admin panel.\n\n" +
        "**Envelope** — success: `{ success: true, message, data, meta? }`; error: `{ success: false, message, error: { code, message, fields? }, requestId }`.\n\n" +
        "**Auth** — cookie based. `POST /v1/auth/login` sets `pf_access` (15 min) and `pf_refresh` (7 days, rotated on every refresh). " +
        "Send requests with credentials (`fetch(..., { credentials: 'include' })`).",
    },
    servers: [{ url: "/" }],
    tags: [...new Set(ops.map((o) => o.tag))].map((name) => ({ name })),
    paths,
    components: {
      securitySchemes: { cookieAuth: { type: "apiKey", in: "cookie", name: "pf_access" } },
      schemas: {
        SuccessEnvelope: {
          type: "object",
          required: ["success", "message", "data"],
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "OK" },
            data: { description: "Resource or list of resources" },
            meta: {
              type: "object",
              description: "Pagination (list endpoints)",
              properties: {
                page: { type: "integer" },
                limit: { type: "integer" },
                total: { type: "integer" },
                totalPages: { type: "integer" },
              },
            },
          },
        },
        ErrorEnvelope: {
          type: "object",
          required: ["success", "message", "error"],
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string" },
            requestId: { type: "string" },
            error: {
              type: "object",
              required: ["code", "message"],
              properties: {
                code: { type: "string", example: "VALIDATION_ERROR" },
                message: { type: "string" },
                fields: { type: "object", additionalProperties: { type: "string" } },
              },
            },
          },
        },
      },
    },
  };
}

/** Exposed for tests: every documented "METHOD /path". */
export const documentedOperations = () => ops.map((o) => `${o.method.toUpperCase()} ${o.path.replace(/\{(\w+)\}/g, ":$1")}`);
