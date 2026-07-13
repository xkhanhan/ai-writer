import { NextResponse } from "next/server";
import { logRequest, logAiOp, logDataOp, logUserAction, logger } from "./logger";

// ============ API Route Logging Wrapper ============

type RouteHandler = (
  request: Request,
  context?: unknown,
) => Promise<NextResponse> | NextResponse;

/**
 * Wrap an API route handler with automatic request/response logging.
 * Usage: export const GET = withLogging("GET", originalHandler);
 */
export function withLogging(
  method: string,
  handler: RouteHandler,
): RouteHandler {
  return async (request: Request, context?: unknown) => {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const start = Date.now();

    try {
      const response = await handler(request, context);
      const duration = Date.now() - start;
      logRequest(method, pathname, response.status, duration);
      return response;
    } catch (err) {
      const duration = Date.now() - start;
      const errorMessage = err instanceof Error ? err.message : String(err);
      logRequest(method, pathname, 500, duration, {
        error: errorMessage,
      });
      logger.error("error", `Unhandled error in ${method} ${pathname}`, {
        error: errorMessage,
        stack: err instanceof Error ? err.stack : undefined,
      });
      throw err;
    }
  };
}

// ============ Re-export helpers for convenience ============

export { logRequest, logAiOp, logDataOp, logUserAction, logger };
