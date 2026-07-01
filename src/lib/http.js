// Small HTTP helpers used by controllers.

// Throw this to short-circuit a request with a specific status + message.
// The central error handler turns it into `{ error: message }` JSON.
export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Wraps an async route handler so thrown/rejected errors reach the error
// middleware instead of crashing the process (Express 5 forwards rejections,
// but this keeps intent explicit and works uniformly).
export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
