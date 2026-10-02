import type { AIModelDefinition } from "@/lib/types";

export const AEGIS_MODELS: AIModelDefinition[] = [
  {
    id: "aegis-core",
    name: "Aegis Core",
    description: "Patient health intelligence for symptoms, medical reports, and lab results in clear plain language.",
    status: "available",
  },
  {
    id: "aegis-research",
    name: "Aegis Research",
    description: "Evidence-oriented health information and research assistance for patient empowerment.",
    status: "coming_soon",
  },
  {
    id: "aegis-pro",
    name: "Aegis Pro",
    description: "Interactive real-time patient voice health assistant for natural spoken health conversations.",
    status: "available",
  },
];

export const DEFAULT_AEGIS_MODEL_ID = "aegis-core";
