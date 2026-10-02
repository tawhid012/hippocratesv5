import "server-only";

import { askOracleService, OracleServiceError, type OracleMessageInput } from "@/services/oracle/oracleService";
import { geminiProvider } from "./gemini";
import { openAIProvider } from "./openai";
import type { AIProviderId } from "./provider";

export { OracleServiceError as OracleError };

export function getUserFacingOracleError(error: unknown): string {
  if (error instanceof OracleServiceError) {
    return error.userFacingMessage;
  }
  return error instanceof Error ? error.message : "Oracle is temporarily unavailable. Please try again.";
}

export async function askOracle(userMessage: string, history: OracleMessageInput[] = [], apiKey?: string) {
  try {
    return await askOracleService(userMessage, history, apiKey);
  } catch (error) {
    throw error;
  }
}

export async function testOracleProvider(provider: AIProviderId, apiKey: string): Promise<void> {
  if (provider === "gemini") {
    await geminiProvider.testConnection(apiKey);
  } else if (provider === "openai") {
    await openAIProvider.testConnection(apiKey);
  } else {
    throw new Error("Unsupported provider.");
  }
}
