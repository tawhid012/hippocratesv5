import "server-only";

export type GeminiContentPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

export interface GeminiContentMessage {
  role: "user" | "model";
  parts: GeminiContentPart[];
}

export interface RawHistoryMessage {
  role: "user" | "assistant" | "system";
  content?: string;
  extraContext?: string;
}

/**
 * Builds a strictly validated Gemini `contents` array.
 * Enforces alternating roles (user -> model -> user -> model), guarantees starting with "user",
 * and merges adjacent messages of the same role to prevent Gemini 400 Invalid Argument errors.
 */
export function buildSanitizedGeminiContents(
  currentParts: GeminiContentPart[],
  rawHistory: RawHistoryMessage[] = []
): GeminiContentMessage[] {
  const sanitized: GeminiContentMessage[] = [];

  // Filter and limit history (last 10 messages)
  const recentHistory = rawHistory
    .filter((m) => m.role !== "system" && (m.content?.trim() || m.extraContext?.trim()))
    .slice(-10);

  // 1. Process history messages
  for (const item of recentHistory) {
    const rawText = (item.content || "").trim();
    const text = item.extraContext ? `${item.extraContext}\n${rawText}` : rawText;
    if (!text) continue;

    const role: "user" | "model" = item.role === "assistant" ? "model" : "user";

    // Merge consecutive messages with the same role
    const last = sanitized[sanitized.length - 1];
    if (last && last.role === role) {
      last.parts.push({ text });
    } else {
      sanitized.push({
        role,
        parts: [{ text }],
      });
    }
  }

  // 2. Ensure history starts with "user" role
  while (sanitized.length > 0 && sanitized[0].role !== "user") {
    sanitized.shift();
  }

  // 3. Append current user prompt/parts
  if (currentParts.length > 0) {
    const last = sanitized[sanitized.length - 1];
    if (last && last.role === "user") {
      // If the last message in history was already "user", merge current parts into it
      last.parts.push(...currentParts);
    } else {
      sanitized.push({
        role: "user",
        parts: [...currentParts],
      });
    }
  }

  // 4. Fallback if sanitized array is empty
  if (sanitized.length === 0) {
    sanitized.push({
      role: "user",
      parts: currentParts.length > 0 ? [...currentParts] : [{ text: "Hello" }],
    });
  }

  return sanitized;
}
