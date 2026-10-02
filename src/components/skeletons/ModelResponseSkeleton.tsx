"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Sparkles, Stethoscope, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/hooks/useAppContext";

const DOCTOR_STAGES = [
  "Synthesizing case context & clinical input...",
  "Analyzing differential diagnoses & clinical guidelines...",
  "Cross-referencing evidence & pharmacological safety...",
  "Formulating structured clinical assessment...",
];

const PATIENT_STAGES = [
  "Reviewing your health question & symptoms...",
  "Formulating clear, patient-friendly guidance...",
  "Evaluating safety & alert parameters...",
  "Preparing personalized health suggestions...",
];

interface ModelResponseSkeletonProps {
  className?: string;
}

export function ModelResponseSkeleton({ className }: ModelResponseSkeletonProps) {
  const { persona } = useApp();
  const isPatient = persona === "patient";
  const stages = isPatient ? PATIENT_STAGES : DOCTOR_STAGES;
  const [currentStageIndex, setCurrentStageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStageIndex((prev) => (prev + 1) % stages.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [stages.length]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={cn("flex gap-3 px-3 sm:px-4 py-3.5 w-full", className)}
      aria-label="Generating clinical response..."
      role="status"
    >
      {/* Avatar with Pulsing Halo */}
      <div className="relative shrink-0">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold transition-all shadow-sm",
            isPatient
              ? "bg-emerald-600 text-white shadow-emerald-500/20"
              : "bg-slate-900 text-white shadow-slate-900/20"
          )}
        >
          {isPatient ? (
            <Shield className="h-4 w-4 text-white animate-pulse" />
          ) : (
            <Stethoscope className="h-4 w-4 text-white animate-pulse" />
          )}
        </div>
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5 items-center justify-center rounded-full ring-2 ring-white dark:ring-slate-900",
            isPatient ? "bg-emerald-500" : "bg-blue-600"
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
        </span>
      </div>

      {/* Main Skeleton Bubble */}
      <div className="flex-1 max-w-[95%] sm:max-w-[85%] lg:max-w-[75%] space-y-3">
        {/* Dynamic Progress Indicator Pill */}
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border shadow-xs transition-all",
              isPatient
                ? "bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/70 dark:border-emerald-800/60"
                : "bg-blue-50/80 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200/70 dark:border-blue-800/60"
            )}
          >
            <Activity className="h-3.5 w-3.5 animate-spin" />
            <AnimatePresence mode="wait">
              <motion.span
                key={currentStageIndex}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                transition={{ duration: 0.2 }}
                className="truncate max-w-[220px] sm:max-w-xs text-[11.5px]"
              >
                {stages[currentStageIndex]}
              </motion.span>
            </AnimatePresence>
          </div>

          <div className="hidden sm:flex items-center gap-1 text-[11px] text-muted-foreground/60">
            <Sparkles className="h-3 w-3 text-amber-500/80" />
            <span>AI reasoning</span>
          </div>
        </div>

        {/* Shimmer Response Card Skeleton */}
        <div className="glass-panel rounded-[1.35rem] rounded-tl-md p-4 sm:p-5 shadow-[0_18px_50px_rgba(26,39,68,0.05)] border border-slate-200/60 dark:border-slate-800/60 space-y-3.5 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md">
          {/* Paragraph 1 lines */}
          <div className="space-y-2">
            <div className="h-3.5 sm:h-4 w-11/12 rounded-lg bg-slate-200/80 dark:bg-slate-800/80 animate-skeleton-shimmer" />
            <div className="h-3.5 sm:h-4 w-full rounded-lg bg-slate-200/80 dark:bg-slate-800/80 animate-skeleton-shimmer" />
            <div className="h-3.5 sm:h-4 w-4/5 rounded-lg bg-slate-200/80 dark:bg-slate-800/80 animate-skeleton-shimmer" />
          </div>

          {/* Simulated Clinical Highlight Box */}
          <div className="p-3 sm:p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-950/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="h-3 w-1/3 rounded-md bg-slate-200/90 dark:bg-slate-800/90 animate-skeleton-shimmer" />
              <div className="h-4 w-16 rounded-full bg-slate-200/90 dark:bg-slate-800/90 animate-skeleton-shimmer" />
            </div>
            <div className="h-3 w-5/6 rounded-md bg-slate-200/70 dark:bg-slate-800/70 animate-skeleton-shimmer" />
            <div className="h-3 w-3/4 rounded-md bg-slate-200/70 dark:bg-slate-800/70 animate-skeleton-shimmer" />
          </div>

          {/* Paragraph 2 lines */}
          <div className="space-y-2 pt-1">
            <div className="h-3.5 sm:h-4 w-full rounded-lg bg-slate-200/80 dark:bg-slate-800/80 animate-skeleton-shimmer" />
            <div className="h-3.5 sm:h-4 w-2/3 rounded-lg bg-slate-200/80 dark:bg-slate-800/80 animate-skeleton-shimmer" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
