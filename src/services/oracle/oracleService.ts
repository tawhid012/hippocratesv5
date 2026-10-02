import "server-only";

import { getGeminiClient } from "@/lib/gemini/client";
import { getGeminiModelName } from "@/lib/gemini/config";
import { buildSanitizedGeminiContents } from "@/lib/gemini/contents";
import { ORACLE_SYSTEM_PROMPT } from "./oracleSystemPrompt";

export interface OracleMessageInput {
  role: "user" | "assistant" | "system";
  content: string;
}

export class OracleServiceError extends Error {
  constructor(public userFacingMessage: string, rawError?: unknown) {
    super(typeof rawError === "string" ? rawError : (rawError as Error)?.message || userFacingMessage);
    this.name = "OracleServiceError";
  }
}

export function getUserFacingOracleError(error: unknown): string {
  if (error instanceof OracleServiceError) {
    return error.userFacingMessage;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Oracle is temporarily unavailable. Please try again.";
}

function buildOracleContents(prompt: string, history: OracleMessageInput[] = []) {
  return buildSanitizedGeminiContents(
    [{ text: prompt.trim() }],
    history.map((m) => ({ role: m.role, content: m.content }))
  );
}

/**
 * Streams clinical responses from Oracle using native Gemini streaming for ultra-low latency.
 */
export async function* askOracleServiceStream(
  userMessage: string,
  history: OracleMessageInput[] = [],
  apiKey?: string
): AsyncGenerator<string, void, unknown> {
  const prompt = userMessage.trim();
  if (!prompt) {
    throw new OracleServiceError("Please enter a clinical question or case details.");
  }

  let ai;
  try {
    ai = await getGeminiClient(apiKey);
  } catch (err) {
    throw new OracleServiceError("Oracle is not configured. Please set the Gemini API key in the Admin Panel.", err);
  }

  const model = getGeminiModelName();
  const contents = buildOracleContents(prompt, history);

  try {
    const responseStream = await ai.models.generateContentStream({
      model,
      contents,
      config: {
        systemInstruction: ORACLE_SYSTEM_PROMPT,
      },
    });

    for await (const chunk of responseStream) {
      const text = chunk.text;
      if (text) {
        yield text;
      }
    }
  } catch (error: unknown) {
    const errStr = String((error as Error)?.message || error);
    if (errStr.includes("API_KEY_INVALID") || errStr.includes("API key not valid") || errStr.includes("MISSING_GEMINI_API_KEY")) {
      throw new OracleServiceError("Oracle API key configuration error. Please check admin settings.", error);
    }
    if (errStr.includes("RESOURCE_EXHAUSTED") || errStr.includes("quota")) {
      throw new OracleServiceError("Oracle is receiving high traffic right now. Please try again shortly.", error);
    }
    throw new OracleServiceError("Oracle is temporarily unavailable. Please try again.", error);
  }
}

/**
 * Executes a clinical query against Oracle and returns the full aggregated response.
 */
export async function askOracleService(
  userMessage: string,
  history: OracleMessageInput[] = [],
  apiKey?: string
): Promise<string> {
  let fullReply = "";
  for await (const delta of askOracleServiceStream(userMessage, history, apiKey)) {
    fullReply += delta;
  }
  if (!fullReply.trim()) {
    throw new OracleServiceError("Oracle did not produce a response. Please try again.");
  }
  return fullReply.trim();
}

