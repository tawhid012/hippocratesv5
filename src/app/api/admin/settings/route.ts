import { apiError, ok, parseJsonError } from "@/lib/api/response";
import { isAdminAuthenticated } from "@/lib/auth/admin";
import { getAdminSettings, updateAdminSettings } from "@/lib/ai/settings";
import type { AIProviderId } from "@/lib/ai/provider";

function isProvider(value: unknown): value is AIProviderId {
  return value === "openai" || value === "gemini";
}

export async function GET() {
  if (!(await isAdminAuthenticated())) return apiError("Unauthorized.", 401);

  try {
    return ok(await getAdminSettings());
  } catch {
    return apiError("Unable to load admin settings.", 500);
  }
}

export async function PUT(request: Request) {
  if (!(await isAdminAuthenticated())) return apiError("Unauthorized.", 401);

  let body: { activeProvider?: unknown; openaiApiKey?: unknown; geminiApiKey?: unknown };
  try {
    body = await request.json();
  } catch {
    return parseJsonError();
  }

  if (body.activeProvider !== undefined && !isProvider(body.activeProvider)) {
    return apiError("Invalid provider specified.", 400);
  }

  try {
    const settings = await updateAdminSettings({
      activeProvider: isProvider(body.activeProvider) ? body.activeProvider : undefined,
      openaiApiKey: typeof body.openaiApiKey === "string" ? body.openaiApiKey : undefined,
      geminiApiKey: typeof body.geminiApiKey === "string" ? body.geminiApiKey : undefined,
    });
    return ok(settings);
  } catch {
    return apiError("Unable to save admin settings to database.", 500);
  }
}
