"use client";

import { useState, memo } from "react";
import { motion } from "framer-motion";
import { Copy, Check, RotateCcw, Shield, Stethoscope, FileText, CheckCircle2, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage, ChatAttachment } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useApp } from "@/hooks/useAppContext";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { AIThinkingIndicator } from "./AIThinkingIndicator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MessageProps {
  message: ChatMessage;
  onRegenerate?: (id: string) => void;
  onRetry?: () => void;
}

function AttachmentPreviewItem({ attachment }: { attachment: ChatAttachment }) {
  const isImage = attachment.attachmentType === "medical_image" || attachment.type.startsWith("image/");

  return (
    <div className="flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 p-1.5 pr-3 text-xs text-slate-700 dark:text-slate-200 font-medium border border-slate-200/80 dark:border-slate-700 shadow-xs max-w-full">
      {isImage && attachment.dataUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={attachment.dataUrl}
          alt={attachment.name}
          className="h-9 w-9 rounded-lg object-cover border border-slate-300 dark:border-slate-600 shrink-0"
        />
      ) : isImage ? (
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 shrink-0">
          <ImageIcon className="h-4 w-4" />
        </div>
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 shrink-0">
          <FileText className="h-4 w-4" />
        </div>
      )}
      <div className="min-w-0 flex flex-col">
        <span className="truncate text-xs font-medium">{attachment.name}</span>
        <span className="text-[10px] text-slate-500">
          {isImage ? "Physical photo" : "Lab report"}
        </span>
      </div>
    </div>
  );
}

export const Message = memo(function Message({ message, onRegenerate, onRetry }: MessageProps) {
  const { persona } = useApp();
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";
  const isPatient = persona === "patient";
  const isError = message.content === "Something went wrong while generating the response.";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const attachmentsToRender = message.attachments?.length
    ? message.attachments
    : message.attachment
      ? [message.attachment]
      : [];

  /* ========================================================================= */
  /* USER MESSAGE LAYOUT                                                       */
  /* ========================================================================= */
  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
        className="flex justify-end py-2 px-2 sm:px-4 w-full"
      >
        <div className="flex flex-col items-end max-w-[88%] sm:max-w-[78%] lg:max-w-[68%] space-y-1.5">
          {/* User Upload Attachments */}
          {attachmentsToRender.length > 0 && (
            <div className="flex flex-wrap justify-end gap-2 mb-1">
              {attachmentsToRender.map((att, idx) => (
                <AttachmentPreviewItem key={idx} attachment={att} />
              ))}
            </div>
          )}

          {/* User Message Bubble */}
          <div className="rounded-2xl rounded-tr-xs bg-slate-900 text-white px-4 py-2.5 sm:px-5 sm:py-3 shadow-xs">
            <p className="text-[14.5px] sm:text-[15px] leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  /* ========================================================================= */
  /* AI ASSISTANT MESSAGE LAYOUT (Open, Spacious, Clinical Aesthetic)           */
  /* ========================================================================= */
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
      className="group flex gap-3 sm:gap-4 py-4 px-2 sm:px-4 w-full"
    >
      {/* AI Assistant Avatar Badge */}
      <div
        className={cn(
          "flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-xl text-xs font-semibold mt-0.5 select-none",
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

      {/* AI Content Area */}
      <div className="flex-1 min-w-0 max-w-full sm:max-w-[720px] space-y-1.5">
        {/* Assistant Header Identifier */}
        <div className="flex items-center gap-2 select-none mb-1">
          <span className="text-[13.5px] font-semibold text-slate-900 tracking-tight">
            {isPatient ? "Aegis" : "Oracle"}
          </span>
        </div>

        {/* Report Analysis Badge if available */}
        {message.reportAnalysis && (
          <div className="mb-3 inline-flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs text-emerald-900 font-medium">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>
              Analyzed report: <strong>{message.reportAnalysis.report_type || "Medical Report"}</strong>
              {message.reportAnalysis.tests?.length ? ` (${message.reportAnalysis.tests.length} tests evaluated)` : ""}
            </span>
          </div>
        )}

        {/* Error Callout */}
        {isError ? (
          <div className="rounded-xl px-4 py-3 bg-red-50 border border-red-200 shadow-xs space-y-2 max-w-md">
            <p className="text-xs sm:text-sm text-red-800 font-medium leading-relaxed">
              Sorry, I couldn&apos;t complete that response.
            </p>
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="h-7 px-2.5 text-xs border-red-300 text-red-700 hover:bg-red-100/60 rounded-lg gap-1.5"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Retry</span>
              </Button>
            )}
          </div>
        ) : message.isStreaming && !message.content ? (
          /* Live Thinking Indicator */
          <AIThinkingIndicator />
        ) : (
          /* Markdown Streamed / Completed Content */
          <MarkdownRenderer
            content={message.content}
            isStreaming={message.isStreaming}
          />
        )}

        {/* Action Controls (Copy / Regenerate) */}
        {!message.isStreaming && !isError && message.content && (
          <div className="flex items-center gap-1 pt-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleCopy}
                  className="h-7 w-7 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                  aria-label="Copy response"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{copied ? "Copied!" : "Copy response"}</TooltipContent>
            </Tooltip>

            {onRegenerate && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onRegenerate(message.id)}
                    className="h-7 w-7 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                    aria-label="Regenerate response"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Regenerate</TooltipContent>
              </Tooltip>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
});

