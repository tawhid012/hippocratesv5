import { AI_TIMEOUT_MS } from "@/config/ai";
import type { AIProvider, OracleMessage } from "./provider";

interface OpenAIChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string; type?: string; code?: string };
}

async function openAIRequest(apiKey: string, messages: OracleMessage[], signal: AbortSignal) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.2,
    }),
    signal,
  });

  const data = (await response.json().catch(() => ({}))) as OpenAIChatResponse;

  if (!response.ok) {
    if (response.status === 401) throw new Error("INVALID_API_KEY");
    if (response.status === 429) throw new Error("RATE_LIMIT");
    throw new Error(data.error?.message || "PROVIDER_OFFLINE");
  }

  return data;
}

export const openAIProvider: AIProvider = {
  id: "openai",

  async generateReply(messages, apiKey) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

    try {
      const data = await openAIRequest(apiKey, messages, controller.signal);
      const reply = data.choices?.[0]?.message?.content?.trim();
      if (!reply) throw new Error("EMPTY_PROVIDER_RESPONSE");
      return reply;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new Error("TIMEOUT");
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  },

  async testConnection(apiKey) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
    try {
      await openAIRequest(
        apiKey,
        [
          { role: "system", content: "You are Oracle." },
          { role: "user", content: "Reply with ok." },
        ],
        controller.signal
      );
    } finally {
      clearTimeout(timeout);
    }
  },
};
