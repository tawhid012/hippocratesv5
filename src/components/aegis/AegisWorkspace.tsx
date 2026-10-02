"use client";

import { useState } from "react";
import { Shield, AlertCircle, Sparkles } from "lucide-react";
import { ChatArea } from "@/components/chat/ChatArea";
import type { ChatMessage, SafetyEvaluation } from "@/lib/types";
import type { AttachmentFile } from "@/components/chat/ChatInput";
import { GenerateSummaryButton } from "@/components/clinical/GenerateSummaryButton";
import { DocumentGenerationModal } from "@/components/clinical/DocumentGenerationModal";

interface AegisWorkspaceProps {
  messages: ChatMessage[];
  isLoading: boolean;
  isStreaming?: boolean;
  statusText?: string;
  isCaseLoading?: boolean;
  onSend: (message: string, attachment?: AttachmentFile | AttachmentFile[]) => void;
  onRegenerate: (messageId: string) => void;
  onRetry?: () => void;
  safetyEvaluation?: SafetyEvaluation | null;
  assessmentStatus?: string;
  urgencyLevel?: string;
  activeCaseId?: string | null;
}

export function AegisWorkspace({
  messages,
  isLoading,
  isStreaming = false,
  statusText,
  isCaseLoading = false,
  onSend,
  onRegenerate,
  onRetry,
  safetyEvaluation,
  assessmentStatus,
  urgencyLevel,
  activeCaseId,
}: AegisWorkspaceProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 relative">
      {/* Aegis Patient Workspace Header */}
      <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-2.5 border-b border-border/40 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600/10 text-emerald-600">
            <Shield className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-xs font-semibold text-foreground tracking-tight flex items-center gap-1.5">
              <span>AEGIS Patient Health Intelligence</span>
            </h1>
            <p className="text-[10px] text-muted-foreground hidden sm:block">
              Ask health questions & upload medical reports (PDF, JPG, PNG)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <GenerateSummaryButton
              variant="compact"
              onClick={() => setIsModalOpen(true)}
            />
          )}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-300 font-medium border border-slate-200/80 dark:border-slate-700">
            <Sparkles className="h-3 w-3 text-emerald-600 shrink-0" />
            <span>Unified Health & Report Chat</span>
          </div>
        </div>
      </div>

      {/* Safety Banner if Emergency Detected in Chat or Report */}
      {safetyEvaluation?.level === "POTENTIAL_EMERGENCY" && (
        <div className="bg-red-600 text-white px-4 py-3 shadow-md flex items-center gap-3 text-xs sm:text-sm shrink-0">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div className="flex-1">
            <span className="font-bold">EMERGENCY ALERT: </span>
            <span>{safetyEvaluation.emergencyWarning || "Seek immediate emergency medical attention. Call 112 (India) or your local emergency number, or go to the nearest Emergency Department immediately."}</span>
          </div>
        </div>
      )}

      {/* Main Unified Workspace */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <ChatArea
          messages={messages}
          isLoading={isLoading}
          isStreaming={isStreaming}
          statusText={statusText}
          isCaseLoading={isCaseLoading}
          assessmentStatus={assessmentStatus}
          urgencyLevel={urgencyLevel}
          onSend={onSend}
          onRegenerate={onRegenerate}
          onRetry={onRetry}
          onOpenSummary={() => setIsModalOpen(true)}
        />
      </div>

      {/* Clinical Document Generation Modal */}
      <DocumentGenerationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        conversationId={activeCaseId || ""}
        model="Aegis Core"
        messages={messages}
      />
    </div>
  );
}

