import "server-only";

export const DEFAULT_GEMINI_MODEL = "gemini-3.7-flash";

/**
 * Returns the sanitized Gemini model identifier.
 * Ensures invalid tokens, retired models, or high-latency models
 * are safely routed to the ultra-fast, responsive 'gemini-3.7-flash'.
 */
export function getGeminiModelName(): string {
  const envModel = process.env.GEMINI_MODEL?.trim();
  if (
    envModel &&
    !envModel.startsWith("AQ.") &&
    !envModel.includes("/") &&
    !envModel.includes("3.5-flash") &&
    !envModel.includes("2.5-flash") &&
    !envModel.includes("2.0-flash") &&
    !envModel.includes("1.5-flash")
  ) {
    return envModel;
  }
  return DEFAULT_GEMINI_MODEL;
}

export const AI_TIMEOUT_MS = 45_000;
