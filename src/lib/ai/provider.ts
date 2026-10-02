export type AIProviderId = "openai" | "gemini";

export interface OracleMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIProvider {
  id: AIProviderId;
  generateReply(messages: OracleMessage[], apiKey: string): Promise<string>;
  testConnection(apiKey: string): Promise<void>;
}

export interface ProviderRuntimeSettings {
  activeProvider: AIProviderId;
  openaiApiKey: string | null;
  geminiApiKey: string | null;
}
