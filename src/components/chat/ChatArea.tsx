"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDown, Sparkles, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { getGreeting } from "@/lib/utils";
import type { ChatMessage } from "@/lib/types";
import { Message } from "./Message";
import { TypingIndicator } from "./TypingIndicator";
import { ChatInput, type AttachmentFile } from "./ChatInput";
import { useApp } from "@/hooks/useAppContext";
import { ConversationLoadingSkeleton } from "@/components/skeletons/ConversationLoadingSkeleton";
import { GenerateSummaryButton } from "@/components/clinical/GenerateSummaryButton";

interface ChatAreaProps {
  messages: ChatMessage[];
  isLoading: boolean;
  isStreaming?: boolean;
  statusText?: string;
  isCaseLoading?: boolean;
  assessmentStatus?: string;
  urgencyLevel?: string;
  onSend: (message: string, attachment?: AttachmentFile | AttachmentFile[]) => void;
  onRegenerate: (messageId: string) => void;
  onRetry?: () => void;
  onOpenSummary?: () => void;
}

function getAssessmentStatusConfig(status?: string, urgency?: string) {
  const normStatus = (status || "").toUpperCase();
  const normUrgency = (urgency || "").toUpperCase();

  if (normStatus === "URGENT_ACTION_REQUIRED" || normUrgency === "EMERGENCY") {
    return {
      title: "Urgent attention recommended",
      description: "Based on symptoms reported, prompt medical evaluation is recommended.",
      buttonLabel: "Generate Urgent Care Summary",
      badgeText: "Urgent Attention",
      badgeStyle: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
      iconBg: "bg-red-600/10 text-red-600 dark:text-red-400 border-red-500/20",
      iconColor: "text-red-600 dark:text-red-400",
      glowColor: "bg-red-500/10",
      isUrgent: true,
      icon: AlertTriangle,
    };
  }

  if (normStatus === "SUFFICIENT_FOR_PROVISIONAL_ASSESSMENT") {
    return {
      title: "Assessment ready",
      description: "Aegis has enough information to provide a provisional assessment. You can also generate a Health Summary.",
      buttonLabel: "Generate Health Summary",
      badgeText: "Assessment Ready",
      badgeStyle: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
      iconBg: "bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      glowColor: "bg-emerald-500/10",
      isUrgent: false,
      icon: Sparkles,
    };
  }

  if (normStatus === "COMPLETE") {
    return {
      title: "Assessment complete",
      description: "Clinical assessment is complete. You can view or generate the final health summary.",
      buttonLabel: "Generate Health Summary",
      badgeText: "Complete",
      badgeStyle: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
      iconBg: "bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      glowColor: "bg-emerald-500/10",
      isUrgent: false,
      icon: CheckCircle2,
    };
  }

  // Default: INCOMPLETE
  return {
    title: "Assessment in progress",
    description: "Aegis is still gathering information. A provisional summary can be generated from the information available so far.",
    buttonLabel: "Generate Provisional Summary",
    badgeText: "In Progress",
    badgeStyle: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20",
    iconBg: "bg-sky-600/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
    iconColor: "text-sky-600 dark:text-sky-400",
    glowColor: "bg-sky-500/10",
    isUrgent: false,
    icon: Clock,
  };
}

export function ChatArea({
  messages,
  isLoading,
  isStreaming = false,
  statusText = "Thinking...",
  isCaseLoading = false,
  assessmentStatus = "INCOMPLETE",
  urgencyLevel = "ROUTINE",
  onSend,
  onRegenerate,
  onRetry,
  onOpenSummary,
}: ChatAreaProps) {
  const { persona } = useApp();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);

  const hasMessages = messages.length > 0;
  const greeting = getGreeting();
  const isPatient = persona === "patient";

  const checkIfNearBottom = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return true;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    return distanceToBottom < 100;
  }, []);

  const handleScroll = useCallback(() => {
    const near = checkIfNearBottom();
    setIsNearBottom(near);
    if (near) {
      setShowJumpToBottom(false);
    }
  }, [checkIfNearBottom]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior });
    setShowJumpToBottom(false);
  }, []);

  // Auto-scroll logic: only follow new tokens/messages if user is already at the bottom
  useEffect(() => {
    if (!scrollContainerRef.current) return;

    if (isNearBottom) {
      // User is following the conversation - auto-scroll down smoothly
      scrollToBottom(isStreaming ? "auto" : "smooth");
    } else if (isLoading || isStreaming) {
      // User is reading up - show the discreet jump button
      setShowJumpToBottom(true);
    }
  }, [messages, isLoading, isStreaming, isNearBottom, scrollToBottom]);

  if (isCaseLoading) {
    return (
      <div className="flex flex-1 flex-col min-h-0">
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <ConversationLoadingSkeleton />
        </div>
        <ChatInput onSend={onSend} disabled={true} />
      </div>
    );
  }

  // Show typing indicator only when loading and no assistant message placeholder exists yet
  const lastMsg = messages[messages.length - 1];
  const showTypingIndicator = isLoading && (!lastMsg || lastMsg.role === "user");

  if (!hasMessages) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 sm:px-8 pb-14 sm:pb-20">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
          className="text-center mb-10 sm:mb-16 max-w-2xl w-full px-2"
        >
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/60">
            {isPatient ? "AEGIS PATIENT HEALTH INTELLIGENCE" : "Oracle Clinical Workspace"}
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium tracking-[-0.02em] text-foreground/95 mb-3.5 leading-[1.12]">
            {isPatient ? `${greeting}.` : `${greeting}, Doctor.`}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground/75 font-normal tracking-[-0.01em] leading-relaxed max-w-lg mx-auto">
            {isPatient
              ? "How can Aegis help explain your symptoms, reports, or health questions today?"
              : "How can Oracle assist your clinical workflow today?"}
          </p>
        </motion.div>

        <div className="w-full max-w-2xl px-2">
          <ChatInput onSend={onSend} centered />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col min-h-0 relative">
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth"
      >
        <div className="max-w-3xl mx-auto py-5 sm:py-8 space-y-1 px-2 sm:px-4">
          <AnimatePresence mode="popLayout">
            {messages.map((message) => (
              <Message
                key={message.id}
                message={message}
                onRegenerate={onRegenerate}
                onRetry={onRetry}
              />
            ))}
          </AnimatePresence>

          {showTypingIndicator && <TypingIndicator statusText={statusText} />}

          {/* Aegis Clinical Status & Summary Action Card */}
          {isPatient && messages.length >= 2 && !isLoading && !isStreaming && onOpenSummary && (() => {
            const config = getAssessmentStatusConfig(assessmentStatus, urgencyLevel);
            const IconComponent = config.icon;
            return (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className={`my-6 p-5 rounded-2xl glass-strong border ${
                  config.isUrgent
                    ? "border-red-500/30 bg-red-50/50 dark:bg-red-950/20"
                    : "border-white/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-950/60"
                } shadow-[0_16px_40px_-8px_rgba(26,39,68,0.06)] backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden`}
              >
                {/* Soft subtle backing glow inside the card */}
                <div className={`absolute top-0 right-0 w-32 h-32 rounded-full ${config.glowColor} blur-2xl pointer-events-none`} />
                
                <div className="flex items-center gap-3.5 relative z-10">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${config.iconBg} shrink-0`}>
                    <IconComponent className={`h-5 w-5 ${config.isUrgent ? "animate-bounce" : ""}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-serif font-bold text-slate-900 dark:text-white tracking-tight">
                        {config.title}
                      </p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${config.badgeStyle}`}>
                        {config.badgeText}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed max-w-md">
                      {config.description}
                    </p>
                  </div>
                </div>

                <GenerateSummaryButton
                  variant="default"
                  label={config.buttonLabel}
                  onClick={onOpenSummary}
                  className={`shrink-0 text-xs py-2.5 px-4 rounded-xl ${
                    config.isUrgent
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-emerald-600 hover:bg-emerald-700"
                  } text-white font-semibold transition-all hover:scale-[1.01] active:scale-[0.99] relative z-10 shadow-sm`}
                />
              </motion.div>
            );
          })()}

          <div ref={bottomRef} className="h-4" />
        </div>
      </div>

      {/* Discreet floating "↓ New response" button if user scrolled up while reading */}
      <AnimatePresence>
        {showJumpToBottom && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.16 }}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20"
          >
            <button
              type="button"
              onClick={() => scrollToBottom("smooth")}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-900 text-white text-xs font-medium shadow-[0_8px_20px_rgba(0,0,0,0.18)] backdrop-blur-md border border-white/10 transition-all hover:scale-105 active:scale-95"
            >
              <ArrowDown className="h-3.5 w-3.5 animate-bounce" />
              <span>New response</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Non-blocking composer: users can type and submit follow-up questions anytime */}
      <ChatInput onSend={onSend} />
    </div>
  );
}

