import { GoogleGenAI } from "@google/genai";
import { AI_TIMEOUT_MS } from "@/config/ai";
import { getGeminiModelName } from "@/lib/gemini/config";
import type { AIProvider, OracleMessage } from "./provider";

export const geminiProvider: AIProvider = {
  id: "gemini",

  async generateReply(messages: OracleMessage[], apiKey: string) {
    const ai = new GoogleGenAI({ apiKey });
    const model = getGeminiModelName();

    const systemPrompt = messages.find((message) => message.role === "system")?.content;
    const nonSystemMessages = messages.filter((message) => message.role !== "system");

    // Format conversation history into input prompt
    const lastUserMessage = nonSystemMessages[nonSystemMessages.length - 1]?.content || "";
    const conversationHistory = nonSystemMessages.slice(0, -1);

    let formattedInput = lastUserMessage;
    if (conversationHistory.length > 0) {
      const historyStr = conversationHistory
        .map((m) => `${m.role === "assistant" ? "Assistant" : "User"}: ${m.content}`)
        .join("\n\n");
      formattedInput = `Previous conversation history:\n${historyStr}\n\nUser: ${lastUserMessage}`;
    }

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("TIMEOUT")), AI_TIMEOUT_MS)
    );

    try {
      // Primary: attempt fast generateContent
      const generatePromise = ai.models.generateContent({
        model,
        contents: formattedInput,
        config: systemPrompt ? { systemInstruction: systemPrompt } : undefined,
      });

      const response = await Promise.race([generatePromise, timeoutPromise]);

      const reply = response.text?.trim();
      if (reply) {
        return reply;
      }

      // Fallback: attempt interactions API
      const interactionPromise = ai.interactions.create({
        model,
        input: formattedInput,
        system_instruction: systemPrompt,
      });

      const interaction = await Promise.race([interactionPromise, timeoutPromise]);

      let interactionReply = interaction.output_text?.trim();

      if (!interactionReply && interaction.steps) {
        for (const step of interaction.steps) {
          if (step.type === "model_output") {
            const textPart = step.content?.find((c) => c.type === "text");
            if (textPart && textPart.text) {
              interactionReply = (interactionReply || "") + textPart.text;
            }
          }
        }
        interactionReply = interactionReply?.trim();
      }

      if (!interactionReply) {
        throw new Error("EMPTY_PROVIDER_RESPONSE");
      }

      return interactionReply;
    } catch (error: unknown) {
      const errMessage = error instanceof Error ? error.message : String(error);
      if (errMessage === "TIMEOUT") {
        throw new Error("TIMEOUT");
      }
      if (
        errMessage.includes("API_KEY_INVALID") ||
        errMessage.includes("API key not valid") ||
        (errMessage.includes("INVALID_ARGUMENT") && errMessage.includes("API key"))
      ) {
        throw new Error("INVALID_API_KEY");
      }
      if (errMessage.includes("RESOURCE_EXHAUSTED") || errMessage.includes("quota")) {
        throw new Error("RATE_LIMIT");
      }
      throw new Error(errMessage || "Gemini provider error.");
    }
  },

  async testConnection(apiKey) {
    const ai = new GoogleGenAI({ apiKey });
    const model = getGeminiModelName();

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("TIMEOUT")), 12_000)
    );

    try {
      const pingPromise = ai.models.generateContent({
        model,
        contents: "Ping",
      });
      await Promise.race([pingPromise, timeoutPromise]);
    } catch (error: unknown) {
      const errMessage = error instanceof Error ? error.message : String(error);
      if (
        errMessage.includes("API_KEY_INVALID") ||
        errMessage.includes("API key not valid") ||
        (errMessage.includes("INVALID_ARGUMENT") && errMessage.includes("API key"))
      ) {
        throw new Error("INVALID_API_KEY");
      }
      throw new Error(errMessage);
    }
  },
};

