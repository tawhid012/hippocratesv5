import type { LucideIcon } from "lucide-react";
import { Zap, Sparkles, Layers, Brain, Router, Gauge, Cloud } from "lucide-react";

export type ProviderId =
  | "openai"
  | "gemini"
  | "anthropic"
  | "deepseek"
  | "openrouter"
  | "groq"
  | "azure-openai";

export type ProviderStatus =
  | "connected"
  | "disconnected"
  | "testing"
  | "error"
  | "not_configured";

export interface ProviderDefinition {
  id: ProviderId;
  name: string;
  description: string;
  icon: LucideIcon;
  available: boolean;
}

export interface ProviderState {
  enabled: boolean;
  apiKey: string;
  isConfigured: boolean;
  maskedKey?: string;
  status: ProviderStatus;
  lastSaved?: Date;
}

export const ACTIVE_PROVIDERS: ProviderDefinition[] = [
  {
    id: "gemini",
    name: "Google Gemini",
    description: "Gemini models via Google AI API (Clinical Engine)",
    icon: Sparkles,
    available: true,
  },
  {
    id: "openai",
    name: "OpenAI",
    description: "GPT models via OpenAI API",
    icon: Zap,
    available: true,
  },
];

export const FUTURE_PROVIDERS: ProviderDefinition[] = [
  {
    id: "anthropic",
    name: "Anthropic",
    description: "Claude models via Anthropic API",
    icon: Brain,
    available: false,
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    description: "DeepSeek models via DeepSeek API",
    icon: Layers,
    available: false,
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    description: "Multi-model routing via OpenRouter",
    icon: Router,
    available: false,
  },
  {
    id: "groq",
    name: "Groq",
    description: "Fast inference via Groq API",
    icon: Gauge,
    available: false,
  },
  {
    id: "azure-openai",
    name: "Azure OpenAI",
    description: "Enterprise OpenAI via Azure",
    icon: Cloud,
    available: false,
  },
];

export function createDefaultProviderStates(): Record<ProviderId, ProviderState> {
  return {
    gemini: { enabled: true, apiKey: "", isConfigured: false, status: "not_configured" },
    openai: { enabled: false, apiKey: "", isConfigured: false, status: "not_configured" },
    anthropic: { enabled: false, apiKey: "", isConfigured: false, status: "not_configured" },
    deepseek: { enabled: false, apiKey: "", isConfigured: false, status: "not_configured" },
    openrouter: { enabled: false, apiKey: "", isConfigured: false, status: "not_configured" },
    groq: { enabled: false, apiKey: "", isConfigured: false, status: "not_configured" },
    "azure-openai": { enabled: false, apiKey: "", isConfigured: false, status: "not_configured" },
  };
}

export function getActiveProviderName(
  states: Record<ProviderId, ProviderState>
): string | null {
  const active = ACTIVE_PROVIDERS.find((p) => states[p.id]?.enabled);
  return active?.name ?? null;
}
