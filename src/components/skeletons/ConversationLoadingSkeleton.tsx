"use client";

import { motion } from "framer-motion";
import { User, Shield, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/hooks/useAppContext";

export function ConversationLoadingSkeleton() {
  const { persona } = useApp();
  const isPatient = persona === "patient";

  return (
    <div className="max-w-3xl mx-auto py-6 sm:py-10 space-y-6 px-2 sm:px-4 w-full" role="status" aria-label="Loading conversation history...">
      {/* 1. User Message Skeleton (Right-aligned) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex flex-row-reverse gap-3 px-4 py-2"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-400">
          <User className="h-4 w-4" />
        </div>
        <div className="max-w-[75%] sm:max-w-[60%] rounded-[1.35rem] rounded-tr-md p-4 bg-slate-200/80 dark:bg-slate-800/80 space-y-2 animate-skeleton-shimmer">
          <div className="h-3.5 w-48 rounded-md bg-slate-300/80 dark:bg-slate-700/80" />
          <div className="h-3.5 w-32 rounded-md bg-slate-300/80 dark:bg-slate-700/80" />
        </div>
      </motion.div>

      {/* 2. Assistant Response Skeleton (Left-aligned) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.05 }}
        className="flex flex-row gap-3 px-4 py-2"
      >
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white",
            isPatient ? "bg-emerald-600/80" : "bg-slate-900/80"
          )}
        >
          {isPatient ? (
            <Shield className="h-4 w-4" />
          ) : (
            <Stethoscope className="h-4 w-4" />
          )}
        </div>
        <div className="flex-1 max-w-[90%] sm:max-w-[78%] rounded-[1.35rem] rounded-tl-md p-5 glass-panel border border-slate-200/60 dark:border-slate-800/60 space-y-3 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md">
          <div className="space-y-2">
            <div className="h-3.5 w-5/6 rounded-lg bg-slate-200/80 dark:bg-slate-800/80 animate-skeleton-shimmer" />
            <div className="h-3.5 w-full rounded-lg bg-slate-200/80 dark:bg-slate-800/80 animate-skeleton-shimmer" />
            <div className="h-3.5 w-4/5 rounded-lg bg-slate-200/80 dark:bg-slate-800/80 animate-skeleton-shimmer" />
          </div>
          <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-950/40 space-y-2">
            <div className="h-3 w-1/3 rounded bg-slate-200/90 dark:bg-slate-800/90 animate-skeleton-shimmer" />
            <div className="h-3 w-3/4 rounded bg-slate-200/70 dark:bg-slate-800/70 animate-skeleton-shimmer" />
          </div>
          <div className="space-y-2 pt-1">
            <div className="h-3.5 w-full rounded-lg bg-slate-200/80 dark:bg-slate-800/80 animate-skeleton-shimmer" />
            <div className="h-3.5 w-2/3 rounded-lg bg-slate-200/80 dark:bg-slate-800/80 animate-skeleton-shimmer" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
