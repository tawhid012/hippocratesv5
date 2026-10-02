import "server-only";
import { GoogleGenAI } from "@google/genai";
import { getAISettings } from "@/lib/ai/settings";

const clientCache = new Map<string, GoogleGenAI>();

/**
 * Retrieves the currently active Gemini API key from the database / runtime settings.
 */
export async function getActiveGeminiApiKey(): Promise<string> {
  const settings = await getAISettings();
  const key = settings.geminiApiKey?.trim() || process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    throw new Error("MISSING_GEMINI_API_KEY");
  }
  console.log("DEBUG: Using Gemini API Key starting with:", key.substring(0, 10));
  return key;
}

/**
 * Returns a GoogleGenAI client configured with the active Gemini API key.
 * Caches initialized instances per API key for instant reuse and zero-latency TTFT.
 */
export async function getGeminiClient(customApiKey?: string): Promise<GoogleGenAI> {
  const apiKey = customApiKey?.trim() || (await getActiveGeminiApiKey());
  if (!apiKey) {
    throw new Error("MISSING_GEMINI_API_KEY");
  }

  let client = clientCache.get(apiKey);
  if (!client) {
    client = new GoogleGenAI({ apiKey });
    clientCache.set(apiKey, client);
  }
  return client;
}


