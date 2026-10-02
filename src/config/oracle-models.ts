import type { AIModelDefinition } from "@/lib/types";

export const ORACLE_MODELS: AIModelDefinition[] = [
  {
    id: "oracle-core",
    name: "Oracle Core",
    description: "Balanced clinical decision support for everyday patient cases",
    status: "available",
  },
  {
    id: "oracle-pro",
    name: "Oracle Pro",
    description: "Advanced diagnostics and complex multi-system case analysis",
    status: "coming_soon",
  },
  {
    id: "oracle-research",
    name: "Oracle Research",
    description: "Evidence-based clinical insights with PubMed literature references",
    status: "coming_soon",
  },
];
