"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ConversationProvider, useConversation } from "@elevenlabs/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Shield,
  ArrowLeft,
  AlertCircle,
  RotateCcw,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/hooks/useAppContext";
import { GenerateSummaryButton } from "@/components/clinical/GenerateSummaryButton";
import { DocumentGenerationModal } from "@/components/clinical/DocumentGenerationModal";

function AegisProVoiceContent() {
  const { setSelectedModel } = useApp();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [capturedConversationId, setCapturedConversationId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [hasStartedOnce, setHasStartedOnce] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const cachedAgentIdRef = useRef<string>("agent_8001m00as049frhtj6694xbqyhvs");
  const voiceConsultationIdRef = useRef<string>(crypto.randomUUID());

  // Pre-fetch agent configuration in background on mount so startCall is instantaneous
  useEffect(() => {
    void fetch("/api/aegis-pro/config", { method: "GET", cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return {};
        return (await res.json().catch(() => ({}))) as { agentId?: string };
      })
      .then((data) => {
        if (data?.agentId) {
          cachedAgentIdRef.current = data.agentId;
        }
      })
      .catch(() => {
        // Fallback default agent id is already set
      });
  }, []);

  const conversation = useConversation({
    onConnect: () => {
      setErrorMessage(null);
      setCallDuration(0);
      setHasStartedOnce(true);
      try {
        const id = conversation.getId();
        if (id) setCapturedConversationId(id);
      } catch {
        // ID may become available after initial exchange
      }
    },
    onDisconnect: () => {
      try {
        const id = conversation.getId();
        if (id) setCapturedConversationId(id);
      } catch {
        // Preserved internally for future summaries
      }
    },
    onMessage: () => {
      try {
        const id = conversation.getId();
        if (id && !capturedConversationId) {
          setCapturedConversationId(id);
        }
      } catch {
        // Preserved internally for future summaries
      }
    },
    onError: (err: unknown) => {
      console.error("ElevenLabs conversation error:", err);
      let msg = "Unable to establish voice connection. Please verify your connection and microphone.";
      if (typeof err === "string") {
        msg = err;
      } else if (
        err &&
        typeof err === "object" &&
        "message" in err &&
        typeof (err as { message: unknown }).message === "string"
      ) {
        msg = (err as { message: string }).message;
      }

      if (msg.includes("not allowed") || msg.includes("denied permission") || msg.includes("NotAllowedError")) {
        msg = "Microphone access is blocked or denied in this context. Please grant microphone access or open the app in a new tab.";
      }
      setErrorMessage(msg);
    },
  });

  const { status, isSpeaking } = conversation;

  // Track conversation ID internally
  useEffect(() => {
    if (status === "connected" && !capturedConversationId) {
      const interval = setInterval(() => {
        try {
          const id = conversation.getId();
          if (id) {
            setCapturedConversationId(id);
            clearInterval(interval);
          }
        } catch {
          // Ignore
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [status, capturedConversationId, conversation]);

  // Duration timer while connected
  useEffect(() => {
    if (status === "connected") {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [status]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStartCall = useCallback(async () => {
    setErrorMessage(null);

    try {
      if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
        try {
          const testStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          testStream.getTracks().forEach((track) => track.stop());
        } catch (micErr: unknown) {
          const isDenied =
            micErr instanceof Error &&
            (micErr.name === "NotAllowedError" ||
              micErr.name === "PermissionDeniedError" ||
              micErr.message.includes("not allowed"));
          if (isDenied) {
            setErrorMessage(
              "Microphone access is blocked or denied. Please grant microphone access in your browser or open the app in a new tab."
            );
            return;
          }
        }
      }

      const targetAgentId = cachedAgentIdRef.current || "agent_8001m00as049frhtj6694xbqyhvs";

      // Direct, low-latency streaming session with 20ms audio buffer chunking
      await conversation.startSession({
        agentId: targetAgentId,
        connectionType: "websocket",
        inputChunkDurationMs: 20,
        useWakeLock: true,
        connectionDelay: { default: 0 },
      });
    } catch (err: unknown) {
      console.error("Failed to start Aegis Pro session:", err);
      let msg = "Microphone access is required for Aegis Pro. Please check browser permissions and try again.";
      if (err instanceof Error) {
        msg = err.message;
        if (msg.includes("not allowed") || msg.includes("denied permission") || msg.includes("NotAllowedError")) {
          msg = "Microphone access is blocked or denied. Please grant microphone access in your browser or open the app in a new tab.";
        }
      }
      setErrorMessage(msg);
    }
  }, [conversation]);

  const handleEndCall = useCallback(async () => {
    try {
      await conversation.endSession();
    } catch (err) {
      console.error("Error ending session:", err);
    }
  }, [conversation]);

  const handleToggleMute = useCallback(() => {
    try {
      if (
        "setMuted" in conversation &&
        typeof (conversation as unknown as { setMuted?: (m: boolean) => void }).setMuted === "function"
      ) {
        (conversation as unknown as { setMuted: (m: boolean) => void }).setMuted(!isMuted);
      }
    } catch {
      // Ignore
    }
    setIsMuted((prev) => !prev);
  }, [conversation, isMuted]);

  const handleBackToCore = () => {
    if (status === "connected" || status === "connecting") {
      void handleEndCall();
    }
    setSelectedModel("aegis-core");
  };

  const isCallActive = status === "connected" || status === "connecting";
  const isCallEnded = status === "disconnected" && hasStartedOnce;

  return (
    <div
      id="aegis-pro-container"
      className="flex flex-col flex-1 h-full min-h-0 w-full relative bg-background/50 select-none overflow-hidden"
    >
      {/* Top Bar: Minimal Header with Navigation & Live Timer */}
      <header
        id="aegis-pro-header"
        className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-3.5 z-10 w-full max-w-xl mx-auto"
      >
        <button
          id="btn-back-to-aegis-core"
          type="button"
          onClick={handleBackToCore}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors p-1.5 -ml-1.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Return to Aegis Core Chat"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Aegis Core</span>
        </button>

        {isCallActive && (
          <div
            id="aegis-pro-live-timer"
            className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-medium tracking-wide"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>{status === "connecting" ? "Connecting" : formatDuration(callDuration)}</span>
          </div>
        )}
      </header>

      {/* Main Calling Stage: Responsively Centered, Thumb-Friendly */}
      <main
        id="aegis-pro-stage"
        className="flex-1 flex flex-col justify-between items-center px-4 sm:px-6 py-4 sm:py-6 max-w-xl mx-auto w-full min-h-0"
      >
        {/* Error Notification Banner */}
        <AnimatePresence>
          {errorMessage && (
            <motion.div
              id="aegis-pro-error-banner"
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              className="w-full mb-4 p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-start gap-3 text-xs sm:text-sm"
              role="alert"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1.5">
                <p className="leading-relaxed">{errorMessage}</p>
                {(errorMessage.includes("new tab") || errorMessage.includes("blocked") || errorMessage.includes("denied")) && (
                  <a
                    href="/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold underline hover:no-underline text-destructive cursor-pointer"
                  >
                    Open App in New Tab
                  </a>
                )}
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-xs font-medium underline-offset-2 hover:underline shrink-0 cursor-pointer"
              >
                Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Center Stage: Caller Identity, Subtle Animated Avatar & Dynamic State */}
        <div className="flex-1 flex flex-col items-center justify-center text-center my-auto w-full max-w-sm">
          {/* Header Title */}
          <div className="space-y-1 mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-foreground">
              Aegis Pro
            </h1>
            <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground">
              Patient Voice Assistant
            </p>
          </div>

          {/* Avatar with Calm Voice Pulse */}
          <div className="relative flex items-center justify-center my-4 sm:my-6">
            {/* Subtle acoustic wave rings (Active Call Only) */}
            {status === "connected" && (
              <>
                <motion.div
                  animate={{
                    scale: isSpeaking ? [1, 1.22, 1] : [1, 1.08, 1],
                    opacity: isSpeaking ? [0.25, 0.5, 0.25] : [0.15, 0.28, 0.15],
                  }}
                  transition={{
                    duration: isSpeaking ? 1.6 : 2.8,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className={cn(
                    "absolute h-36 w-36 sm:h-44 sm:w-44 rounded-full pointer-events-none",
                    isSpeaking ? "bg-emerald-500/20" : "bg-primary/10"
                  )}
                />
                <motion.div
                  animate={{
                    scale: isSpeaking ? [1, 1.4, 1] : [1, 1.15, 1],
                    opacity: isSpeaking ? [0.12, 0.3, 0.12] : [0.08, 0.16, 0.08],
                  }}
                  transition={{
                    duration: isSpeaking ? 2.0 : 3.4,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.2,
                  }}
                  className={cn(
                    "absolute h-48 w-48 sm:h-56 sm:w-56 rounded-full pointer-events-none",
                    isSpeaking ? "bg-emerald-500/10" : "bg-primary/5"
                  )}
                />
              </>
            )}

            {/* Core Circular Avatar */}
            <div
              className={cn(
                "relative h-24 w-24 sm:h-28 sm:w-28 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm border",
                status === "connected"
                  ? isSpeaking
                    ? "bg-emerald-600 text-white border-emerald-500/40 shadow-emerald-500/20"
                    : isMuted
                    ? "bg-slate-100 dark:bg-slate-800 text-muted-foreground border-border"
                    : "bg-primary text-primary-foreground border-primary/20"
                  : status === "connecting"
                  ? "bg-muted text-muted-foreground border-border animate-pulse"
                  : isCallEnded
                  ? "bg-slate-100 dark:bg-slate-800/80 text-muted-foreground border-border"
                  : "bg-white dark:bg-slate-900 text-primary border-border hover:border-primary/30"
              )}
            >
              <Shield className="h-10 w-10 sm:h-12 sm:w-12 transition-transform duration-200" />

              {/* Muted mini-badge */}
              {isMuted && status === "connected" && (
                <span className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-sm">
                  <MicOff className="h-3.5 w-3.5" />
                </span>
              )}
            </div>
          </div>

          {/* Dynamic State Text & Call Metrics */}
          <div className="mt-4 sm:mt-6 space-y-1.5">
            {!hasStartedOnce && status === "disconnected" && (
              <>
                <p className="text-base font-medium text-foreground">Ready to talk</p>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                  Start a private voice conversation to discuss symptoms and health questions.
                </p>
              </>
            )}

            {status === "connecting" && (
              <>
                <p className="text-base font-medium text-foreground">Connecting...</p>
                <p className="text-xs text-muted-foreground">Setting up secure audio line</p>
              </>
            )}

            {status === "connected" && (
              <>
                <p className="text-base font-medium text-foreground">
                  {isSpeaking
                    ? "Aegis Pro is speaking..."
                    : isMuted
                    ? "Microphone muted"
                    : "Listening..."}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isSpeaking
                    ? "Providing health guidance"
                    : isMuted
                    ? "Tap unmute to speak"
                    : '"I\'m listening to you."'}
                </p>
              </>
            )}

            {isCallEnded && (
              <div className="space-y-2">
                <p className="text-base font-medium text-foreground">Conversation ended</p>
                <div className="inline-flex flex-col items-center py-1">
                  <span className="text-xl font-mono font-semibold text-foreground tracking-tight">
                    {formatDuration(callDuration)}
                  </span>
                  <span className="text-[11px] text-muted-foreground">Call duration</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Area: Calling Controls & Action Buttons */}
        <div id="aegis-pro-controls" className="w-full flex flex-col items-center gap-3 pt-4 pb-2">
          {!isCallActive && !isCallEnded && (
            <div className="flex flex-col items-center gap-3 w-full max-w-xs">
              <button
                id="btn-start-call"
                type="button"
                onClick={handleStartCall}
                className="w-full h-13 rounded-2xl bg-primary hover:bg-primary/95 active:scale-[0.98] text-primary-foreground font-medium text-sm shadow-md transition-all flex items-center justify-center gap-2.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Phone className="h-4 w-4" />
                <span>Start conversation</span>
              </button>

              <button
                id="btn-return-core"
                type="button"
                onClick={handleBackToCore}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors py-1 cursor-pointer"
              >
                For lab reports or images, open Aegis Core
              </button>
            </div>
          )}

          {status === "connecting" && (
            <div className="flex flex-col items-center">
              <button
                id="btn-cancel-connection"
                type="button"
                onClick={handleEndCall}
                className="h-14 w-14 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 text-white shadow-md transition-all flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                aria-label="Cancel Connection"
              >
                <PhoneOff className="h-5 w-5" />
              </button>
              <span className="text-[11px] font-medium text-muted-foreground mt-2">Cancel</span>
            </div>
          )}

          {status === "connected" && (
            <div className="flex items-center justify-center gap-8 sm:gap-12">
              {/* Mute Control */}
              <div className="flex flex-col items-center">
                <button
                  id="btn-toggle-mute"
                  type="button"
                  onClick={handleToggleMute}
                  className={cn(
                    "h-14 w-14 rounded-full border shadow-sm transition-all flex items-center justify-center cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isMuted
                      ? "bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25"
                      : "bg-white/80 dark:bg-slate-800/80 border-border text-foreground hover:bg-white dark:hover:bg-slate-800"
                  )}
                  aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
                >
                  {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </button>
                <span className="text-[11px] font-medium text-muted-foreground mt-2">
                  {isMuted ? "Unmute" : "Mute"}
                </span>
              </div>

              {/* End Call Control */}
              <div className="flex flex-col items-center">
                <button
                  id="btn-end-call"
                  type="button"
                  onClick={handleEndCall}
                  className="h-14 w-14 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 text-white shadow-md transition-all flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                  aria-label="End call"
                >
                  <PhoneOff className="h-5 w-5" />
                </button>
                <span className="text-[11px] font-medium text-muted-foreground mt-2">End</span>
              </div>
            </div>
          )}

          {isCallEnded && (
            <div className="flex flex-col items-center gap-3 w-full max-w-xs">
              <GenerateSummaryButton
                variant="default"
                label="Generate Health Summary"
                onClick={() => setIsSummaryModalOpen(true)}
                className="w-full h-12 text-sm font-semibold rounded-2xl shadow-md"
              />

              <button
                id="btn-restart-call"
                type="button"
                onClick={handleStartCall}
                className="w-full h-11 rounded-2xl border border-border bg-white/60 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 active:scale-[0.98] text-foreground font-medium text-xs transition-all flex items-center justify-center gap-2.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Start New Conversation</span>
              </button>

              <button
                id="btn-return-after-end"
                type="button"
                onClick={handleBackToCore}
                className="w-full h-10 rounded-2xl border border-transparent hover:border-border hover:bg-slate-100 dark:hover:bg-slate-800/50 active:scale-[0.98] text-muted-foreground hover:text-foreground font-medium text-xs transition-all flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Return to Aegis Core</span>
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Clinical Document Generation Modal for Aegis Pro */}
      <DocumentGenerationModal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
        conversationId={capturedConversationId || voiceConsultationIdRef.current}
        model="Aegis Pro"
        elevenlabsConversationId={capturedConversationId || undefined}
        transcript={hasStartedOnce ? "Patient completed Aegis Pro real-time voice health discussion." : undefined}
      />
    </div>
  );
}

export function AegisProVoiceView() {
  return (
    <ConversationProvider>
      <AegisProVoiceContent />
    </ConversationProvider>
  );
}
