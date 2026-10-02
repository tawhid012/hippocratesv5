import { apiError, ok, parseJsonError } from "@/lib/api/response";
import { isAdminAuthenticated } from "@/lib/auth/admin";
import { getUserFacingOracleError, testOracleProvider } from "@/lib/ai/oracle";
import { getAISettings } from "@/lib/ai/settings";
import type { AIProviderId } from "@/lib/ai/provider";

function isProvider(value: unknown): value is AIProviderId {
  return value === "openai" || value === "gemini";
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) return apiError("Unauthorized.", 401);

  let body: { provider?: unknown; apiKey?: unknown };
  try {
    body = await request.json();
  } catch {
    return parseJsonError();
  }

  if (!isProvider(body.provider)) return apiError("Invalid provider.", 400);

  let keyToTest = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
  if (!keyToTest) {
    const settings = await getAISettings();
    keyToTest = body.provider === "gemini" ? settings.geminiApiKey || "" : settings.openaiApiKey || "";
  }

  if (!keyToTest) {
    return apiError("No API key provided or found in database.", 400);
  }

  try {
    await testOracleProvider(body.provider, keyToTest);
    return ok({ status: "connected" });
  } catch (error) {
    return apiError(getUserFacingOracleError(error), 400);
  }
}

