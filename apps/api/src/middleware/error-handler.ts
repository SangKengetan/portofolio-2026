import type { ErrorRequestHandler, RequestHandler } from "express";
import multer from "multer";
import { AppError } from "../common/errors";

export interface ErrorBody {
  success: false;
  message: string;
  error: { code: string; message: string; fields?: Record<string, string> };
  requestId?: string;
}

const body = (status: number, code: string, message: string, requestId: unknown, fields?: Record<string, string>) => ({
  status,
  json: {
    success: false,
    message,
    error: { code, message, ...(fields ? { fields } : {}) },
    ...(typeof requestId === "string" ? { requestId } : {}),
  } satisfies ErrorBody,
});

/** Postgres error codes that mean "the client asked for something the data does not allow". */
function fromPostgres(err: { code?: string; constraint?: string; detail?: string }) {
  switch (err.code) {
    case "23505":
      return { status: 409, code: "CONFLICT", message: "A record with the same unique value already exists." };
    case "23503":
      return { status: 409, code: "REFERENCE_ERROR", message: "A referenced record does not exist or is still in use." };
    case "23514":
    case "22007":
    case "22P02":
      return { status: 422, code: "VALIDATION_ERROR", message: "A value is out of the allowed range or format." };
    default:
      return null;
  }
}

export const notFoundHandler: RequestHandler = (req, res) => {
  const b = body(404, "ROUTE_NOT_FOUND", `Route ${req.method} ${req.path} not found.`, req.id);
  res.status(b.status).json(b.json);
};

// Express identifies error middleware by its 4-argument signature, so `_next` must stay.
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  let b: ReturnType<typeof body>;

  if (err instanceof AppError) {
    b = body(err.status, err.code, err.message, req.id, err.fields);
  } else if (err instanceof multer.MulterError) {
    b =
      err.code === "LIMIT_FILE_SIZE"
        ? body(413, "FILE_TOO_LARGE", "The file is too large.", req.id)
        : body(400, "UPLOAD_ERROR", "The upload could not be processed.", req.id);
  } else if (err?.type === "entity.parse.failed") {
    b = body(400, "INVALID_JSON", "Request body is not valid JSON.", req.id);
  } else if (err?.type === "entity.too.large") {
    b = body(413, "PAYLOAD_TOO_LARGE", "Request body is too large.", req.id);
  } else if (typeof err?.code === "string" && fromPostgres(err)) {
    const pg = fromPostgres(err)!;
    b = body(pg.status, pg.code, pg.message, req.id);
  } else {
    // Unknown failure: log everything, tell the client nothing.
    req.log?.error({ err }, "unhandled error");
    b = body(500, "INTERNAL_ERROR", "Something went wrong on our side. Please try again later.", req.id);
  }

  if (b.status < 500 && !(err instanceof AppError)) req.log?.warn({ err }, "request rejected");
  res.status(b.status).json(b.json);
};
