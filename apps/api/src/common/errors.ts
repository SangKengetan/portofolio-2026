/**
 * Application errors. Anything thrown as an AppError is rendered by the central error handler with its
 * own status code; any other error becomes a generic 500 (details are logged, never sent to the client).
 */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const badRequest = (message: string, code = "BAD_REQUEST") => new AppError(400, code, message);
export const unauthorized = (message = "Authentication required.", code = "UNAUTHORIZED") =>
  new AppError(401, code, message);
export const forbidden = (message = "You are not allowed to do this.", code = "FORBIDDEN") =>
  new AppError(403, code, message);
export const notFound = (what = "Resource", code = "NOT_FOUND") => new AppError(404, code, `${what} not found.`);
export const conflict = (message: string, code = "CONFLICT") => new AppError(409, code, message);
export const payloadTooLarge = (message: string) => new AppError(413, "FILE_TOO_LARGE", message);
export const unsupportedMedia = (message: string) => new AppError(415, "UNSUPPORTED_MEDIA_TYPE", message);
export const validationError = (fields: Record<string, string>, message?: string) => {
  const first = Object.values(fields)[0];
  const text = message ?? (Object.keys(fields).length === 1 && first ? first : "Validation failed.");
  return new AppError(422, "VALIDATION_ERROR", text, fields);
};
export const tooManyRequests = (message = "Too many requests, please try again later.") =>
  new AppError(429, "RATE_LIMITED", message);
export const unavailable = (message: string, code = "SERVICE_UNAVAILABLE") => new AppError(503, code, message);
