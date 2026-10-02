import type { AIProviderId } from "@/lib/ai/provider";
import { getGeminiModelName } from "@/lib/gemini/config";

export const DEFAULT_ACTIVE_PROVIDER: AIProviderId =
  process.env.ACTIVE_PROVIDER === "openai" ? "openai" : "gemini";

export const DEFAULT_GEMINI_MODEL = getGeminiModelName();

export const ORACLE_MODEL_NAME = "Oracle Core";

export const AI_TIMEOUT_MS = 45_000;
