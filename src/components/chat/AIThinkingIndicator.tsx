"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useApp } from "@/hooks/useAppContext";

interface AIThinkingIndicatorProps {
  statusText?: string;
  className?: string;
}

export const AIThinkingIndicator = memo(function AIThinkingIndicator({
  statusText,
  className,
}: AIThinkingIndicatorProps) {
  const { persona } = useApp();
  const isPatient = persona === "patient";
  const label = statusText || (isPatient ? "Thinking..." : "Analyzing clinical context...");

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
      className={cn("flex items-center gap-2.5 py-0.5 select-none", className)}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      {/* Dynamic 3-dot pulse animation */}
      <div className="flex items-center gap-1">
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full animate-pulse [animation-duration:1.1s] [animation-delay:0ms]",
            isPatient ? "bg-emerald-600/90" : "bg-blue-600/90"
          )}
        />
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full animate-pulse [animation-duration:1.1s] [animation-delay:200ms]",
            isPatient ? "bg-emerald-600/90" : "bg-blue-600/90"
          )}
        />
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full animate-pulse [animation-duration:1.1s] [animation-delay:400ms]",
            isPatient ? "bg-emerald-600/90" : "bg-blue-600/90"
          )}
        />
      </div>

      <span className="text-[12.5px] font-medium tracking-[-0.01em] text-slate-600">
        {label}
      </span>
    </motion.div>
  );
});
