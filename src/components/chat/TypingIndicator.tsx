"use client";

import { Shield, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/hooks/useAppContext";
import { AIThinkingIndicator } from "./AIThinkingIndicator";

interface TypingIndicatorProps {
  statusText?: string;
}

export function TypingIndicator({ statusText }: TypingIndicatorProps) {
  const { persona } = useApp();
  const isPatient = persona === "patient";

  return (
    <div className="flex gap-3 sm:gap-4 py-3 px-2 sm:px-4 w-full">
      <div
        className={cn(
          "flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-xl text-xs font-semibold mt-0.5",
          isPatient
            ? "bg-emerald-500/10 text-emerald-700 border border-emerald-600/20"
            : "bg-blue-500/10 text-blue-700 border border-blue-600/20"
        )}
      >
        {isPatient ? (
          <Shield className="h-4 w-4 text-emerald-600" />
        ) : (
          <Stethoscope className="h-4 w-4 text-blue-600" />
        )}
      </div>

      <div className="flex-1 min-w-0 max-w-full sm:max-w-[700px] space-y-1">
        <div className="flex items-center gap-2 select-none mb-1">
          <span className="text-[13.5px] font-semibold text-slate-900 tracking-tight">
            {isPatient ? "Aegis" : "Oracle"}
          </span>
        </div>
        <AIThinkingIndicator statusText={statusText} />
      </div>
    </div>
  );
}

