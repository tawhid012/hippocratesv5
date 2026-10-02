"use client";

import { useCallback, useEffect, useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider, useApp } from "@/hooks/useAppContext";
import { useChat } from "@/hooks/useChat";
import { api } from "@/lib/api-client";
import type { CaseSummary } from "@/lib/types";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { Header } from "@/components/layout/Header";
import { ChatArea } from "@/components/chat/ChatArea";
import { ModelSelector } from "@/components/model-selector/ModelSelector";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { LandingPage } from "@/components/landing/LandingPage";
import { AegisWorkspace } from "@/components/aegis/AegisWorkspace";
import { AegisProVoiceView } from "@/components/aegis/AegisProVoiceView";

import { deleteConsultationState } from "@/lib/consultation/consultationStorage";

function HomeContent() {
  const { persona, selectPersona, selectedModel, setSelectedModel, settingsOpen, setSettingsOpen } = useApp();
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [casesLoading, setCasesLoading] = useState(true);

  const loadCases = useCallback(async () => {
    setCasesLoading(true);
    try {
      const workspace = persona === "patient" ? "aegis" : "oracle";
      setCases(await api.listCases(workspace));
    } catch {
      setCases([]);
    } finally {
      setCasesLoading(false);
    }
  }, [persona]);

  const {
    activeCaseId,
    messages,
    isLoading,
    isStreaming,
    statusText,
    isCaseLoading,
    safetyEvaluation,
    assessmentStatus,
    urgencyLevel,
    sendMessage,
    regenerate,
    retryLastMessage,
    clearMessages,
    startNewConsultation,
    loadCase,
  } = useChat(selectedModel, {
    onCasesChanged: loadCases,
    persona: persona || "doctor",
  });

  useEffect(() => {
    if (persona) {
      void loadCases();
    }
  }, [persona, loadCases]);

  const handleNewCase = () => {
    startNewConsultation();
  };

  const handleSelectCase = async (caseId: string) => {
    await loadCase(caseId);
  };

  const handleDeleteCase = useCallback(
    async (caseId: string) => {
      try {
        deleteConsultationState(caseId);
        await api.deleteCase(caseId);
        if (caseId === activeCaseId) {
          startNewConsultation();
        }
        await loadCases();
      } catch {
        // Silently fail
      }
    },
    [activeCaseId, startNewConsultation, loadCases]
  );

  const handleRenameCase = useCallback(
    async (caseId: string, newTitle: string) => {
      await api.renameCase(caseId, newTitle);
      await loadCases();
    },
    [loadCases]
  );

  const handleRegenerate = useCallback(() => {
    if (messages.length > 0) {
      const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
      if (lastAssistant) {
        void regenerate(lastAssistant.id);
      }
    }
  }, [messages, regenerate]);

  // If no persona has been selected yet, show the Hippocrates public landing page
  if (!persona) {
    return (
      <LandingPage
        onSelectPersona={selectPersona}
        onLaunchAegisPro={() => {
          selectPersona("patient");
          setSelectedModel("aegis-pro");
        }}
      />
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-screen flex-col overflow-hidden bg-background">
        <Header />

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <Sidebar
            onNewCase={handleNewCase}
            onSelectCase={handleSelectCase}
            onDeleteCase={handleDeleteCase}
            onRenameCase={handleRenameCase}
            onOpenSettings={() => setSettingsOpen(true)}
            cases={cases}
            casesLoading={casesLoading}
            activeCaseId={activeCaseId}
          />

          <main className="flex flex-1 flex-col min-w-0 overflow-hidden">
            <div className="flex shrink-0 justify-center px-4 pb-1 pt-3">
              <ModelSelector />
            </div>

            {persona === "doctor" ? (
              <ChatArea
                messages={messages}
                isLoading={isLoading}
                isStreaming={isStreaming}
                statusText={statusText}
                isCaseLoading={isCaseLoading}
                assessmentStatus={assessmentStatus}
                urgencyLevel={urgencyLevel}
                onSend={sendMessage}
                onRegenerate={handleRegenerate}
                onRetry={retryLastMessage}
              />
            ) : selectedModel === "aegis-pro" ? (
              <AegisProVoiceView />
            ) : (
              <AegisWorkspace
                messages={messages}
                isLoading={isLoading}
                isStreaming={isStreaming}
                statusText={statusText}
                isCaseLoading={isCaseLoading}
                onSend={sendMessage}
                onRegenerate={handleRegenerate}
                onRetry={retryLastMessage}
                safetyEvaluation={safetyEvaluation}
                assessmentStatus={assessmentStatus}
                urgencyLevel={urgencyLevel}
                activeCaseId={activeCaseId}
              />
            )}
          </main>
        </div>

        <SettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
        />
      </div>
    </TooltipProvider>
  );
}

export default function HomePage() {
  return (
    <AppProvider>
      <HomeContent />
    </AppProvider>
  );
}
