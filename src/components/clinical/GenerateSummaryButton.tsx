"use client";

import { FileText, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface GenerateSummaryButtonProps {
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "outline" | "compact";
  label?: string;
  className?: string;
}

export function GenerateSummaryButton({
  onClick,
  disabled = false,
  variant = "default",
  label = "Generate Health Summary",
  className,
}: GenerateSummaryButtonProps) {
  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
          "bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 border border-emerald-600/20",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          className
        )}
      >
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
        <span>{label}</span>
      </button>
    );
  }

  if (variant === "outline") {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer border border-border bg-white/60 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-900 text-foreground shadow-sm",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          className
        )}
      >
        <FileText className="h-4 w-4 text-emerald-600 shrink-0" />
        <span>{label}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow active:scale-[0.98]",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
    >
      <Sparkles className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </button>
  );
}
