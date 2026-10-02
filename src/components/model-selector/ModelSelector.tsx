"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Sparkles, Check, Shield, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";
import { ORACLE_MODELS } from "@/config/oracle-models";
import { AEGIS_MODELS } from "@/config/aegis-models";
import { useApp } from "@/hooks/useAppContext";
import { Badge } from "@/components/ui/badge";
import type { AIModelId } from "@/lib/types";

export function ModelSelector() {
  const { persona, selectedModel, setSelectedModel } = useApp();
  const [open, setOpen] = useState(false);

  const isPatient = persona === "patient";
  const models = isPatient ? AEGIS_MODELS : ORACLE_MODELS;

  // Find selected model definition or fallback to default
  const currentModel =
    models.find((m) => m.id === selectedModel) || models[0];

  const handleSelect = (modelId: string, available: boolean) => {
    if (!available) return;
    setSelectedModel(modelId as AIModelId);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "glass-control flex items-center gap-2.5 rounded-xl px-4 py-2 text-[13px] font-medium",
          "transition-all duration-200 cursor-pointer hover:-translate-y-px",
          open && "bg-white/85 shadow-[0_16px_42px_rgba(26,39,68,0.08)] ring-1 ring-hippo-navy/[0.05]"
        )}
      >
        {isPatient ? (
          <Shield className="h-3.5 w-3.5 text-hippo-blue" strokeWidth={2} />
        ) : (
          <Stethoscope className="h-3.5 w-3.5 text-accent" strokeWidth={2} />
        )}

        <span className="text-foreground/90 font-medium">{currentModel.name}</span>

        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground/60 transition-transform duration-250",
            open && "rotate-180"
          )}
          strokeWidth={2}
        />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
              className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 w-[min(340px,calc(100vw-2rem))] bg-white/65 backdrop-blur-xl border border-white/50 rounded-[1.35rem] p-2.5 shadow-[0_28px_80px_rgba(26,39,68,0.14)]"
            >
              <div className="px-3 py-2 mb-1 border-b border-border/40">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">
                    {isPatient ? "Aegis Models (Patient AI)" : "Oracle Models (Doctor AI)"}
                  </p>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-accent/10 text-accent">
                    {isPatient ? "Aegis Core Active" : "Oracle Core Active"}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground/70">
                  {isPatient
                    ? "Patient health intelligence for symptoms and lab report analysis."
                    : "Clinical decision support for doctors and medical professionals."}
                </p>
              </div>

              <div className="space-y-1">
                {models.map((model) => {
                  const isSelected = selectedModel === model.id;
                  const isAvailable = model.status === "available";

                  return (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => handleSelect(model.id, isAvailable)}
                      disabled={!isAvailable}
                      className={cn(
                        "w-full text-left px-3 py-3 rounded-[1rem] transition-all duration-150",
                        !isAvailable
                          ? "opacity-65 cursor-not-allowed bg-slate-50/40"
                          : "cursor-pointer hover:bg-white/70 hover:shadow-[0_10px_26px_rgba(26,39,68,0.045)]",
                        isSelected &&
                          isAvailable &&
                          "bg-white/80 ring-1 ring-accent/20 shadow-[0_10px_28px_rgba(26,39,68,0.065)]"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Sparkles
                            className={cn(
                              "h-3.5 w-3.5 shrink-0",
                              isSelected && isAvailable
                                ? "text-accent"
                                : "text-muted-foreground/50"
                            )}
                            strokeWidth={2}
                          />
                          <span
                            className={cn(
                              "text-[13px] font-semibold",
                              isSelected && isAvailable
                                ? "text-foreground"
                                : "text-foreground/80"
                            )}
                          >
                            {model.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {!isAvailable && (
                            <Badge variant="upcoming">Coming Soon</Badge>
                          )}
                          {isSelected && isAvailable && (
                            <Check className="h-3.5 w-3.5 text-accent" strokeWidth={2.5} />
                          )}
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground/80 mt-1 ml-6 leading-relaxed">
                        {model.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
