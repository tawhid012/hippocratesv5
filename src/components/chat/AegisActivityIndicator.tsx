"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface AegisActivityIndicatorProps {
  statusText?: string;
  className?: string;
}

export const AegisActivityIndicator = memo(function AegisActivityIndicator({
  statusText = "Thinking...",
  className,
}: AegisActivityIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn("flex items-start gap-3 px-4 py-3", className)}
      role="status"
      aria-live="polite"
      aria-label={`Aegis is ${statusText.toLowerCase()}`}
    >
      {/* Aegis Clean Emerald Shield Avatar */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-[0_6px_20px_rgba(16,185,129,0.18)]">
        <Shield className="h-4 w-4 text-white" />
      </div>

      {/* Thinking Bubble */}
      <div className="flex items-center gap-3 rounded-[1.25rem] rounded-tl-sm px-4 py-3 bg-white border border-slate-200/90 shadow-[0_4px_18px_rgba(26,39,68,0.04)] backdrop-blur-sm">
        {/* Subtle 3-dot pulse indicator */}
        <div className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse [animation-duration:1.2s] [animation-delay:0ms]" />
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse [animation-duration:1.2s] [animation-delay:200ms]" />
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse [animation-duration:1.2s] [animation-delay:400ms]" />
        </div>

        <span className="text-[13px] font-medium text-slate-700 tracking-[-0.01em] select-none">
          {statusText}
        </span>
      </div>
    </motion.div>
  );
});
