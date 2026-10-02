"use client";

import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Download,
  Eye,
  RefreshCw,
  X,
  Loader2,
  Shield,
  Info,
} from "lucide-react";
import type { NormalizedClinicalSummary, GenerationState, ModelType } from "@/lib/clinical/types";
import { DocumentPreviewModal } from "./DocumentPreviewModal";

interface DocumentGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  model: ModelType;
  messages?: Array<{ role: string; content: string; attachment?: unknown; reportAnalysis?: unknown }>;
  transcript?: string;
  elevenlabsConversationId?: string;
  patientInfo?: { name?: string; age?: string; sex?: string };
}

export function DocumentGenerationModal({
  isOpen,
  onClose,
  conversationId,
  model,
  messages = [],
  transcript,
  elevenlabsConversationId,
  patientInfo,
}: DocumentGenerationModalProps) {
  const [state, setState] = useState<GenerationState | "EMPTY_ERROR">("IDLE");
  const [stepIndex, setStepIndex] = useState(0);
  const [summary, setSummary] = useState<NormalizedClinicalSummary | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Patient biodata form states
  const [patientData, setPatientData] = useState({
    name: patientInfo?.name || "",
    age: patientInfo?.age || "",
    sex: patientInfo?.sex || "",
    history: "",
    medications: "",
    allergies: "",
  });
  const [isCollectingBiodata, setIsCollectingBiodata] = useState(false);
  const [adequacyReason, setAdequacyReason] = useState<string | null>(null);

  // Complete clinical isolation: reset all generated summaries and clinical fields when consultation changes
  useEffect(() => {
    setSummary(null);
    setState("IDLE");
    setStepIndex(0);
    setErrorMsg(null);
    setAdequacyReason(null);
    setIsCollectingBiodata(false);
    // Reset clinical fields (preserve only demographic info if present)
    setPatientData({
      name: patientInfo?.name || "",
      age: patientInfo?.age || "",
      sex: patientInfo?.sex || "",
      history: "",
      medications: "",
      allergies: "",
    });
  }, [conversationId, patientInfo]);

  // When messages are cleared (new consultation), guarantee summary is wiped
  useEffect(() => {
    if (!messages || messages.length === 0) {
      setSummary(null);
      setState("IDLE");
      setStepIndex(0);
      setErrorMsg(null);
    }
  }, [messages]);

  // Sync with prop patientInfo if it gets updated
  useEffect(() => {
    if (patientInfo) {
      setPatientData((prev) => ({
        ...prev,
        name: patientInfo.name || prev.name,
        age: patientInfo.age || prev.age,
        sex: patientInfo.sex || prev.sex,
      }));
    }
  }, [patientInfo]);

  // Load from database if a valid active case ID is present
  useEffect(() => {
    if (isOpen && conversationId && conversationId.length > 5) {
      fetch(`/api/cases/${conversationId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data?.case?.metadata?.patientInfo) {
            const info = data.case.metadata.patientInfo;
            setPatientData({
              name: info.name || "",
              age: info.age || "",
              sex: info.sex || "",
              history: info.history || "",
              medications: info.medications || "",
              allergies: info.allergies || "",
            });
          }
        })
        .catch((err) => console.warn("Failed to load patientInfo from DB:", err));
    }
  }, [isOpen, conversationId]);

  const steps = [
    "Analyzing conversation history",
    "Structuring clinical findings & care plan",
    "Preparing professional PDF document",
    "Clinical summary ready",
  ];

  const getConversationStatus = useCallback(() => {
    if ((!messages || messages.length === 0) && !transcript) {
      return {
        isAdequate: false,
        reason: "The conversation is empty. Please interact with the patient first before compiling a health summary."
      };
    }

    const greetingPhrases = ["hello", "hi", "hey", "good morning", "good afternoon", "good evening", "thanks", "thank you", "okay", "ok", "yes", "no", "sure", "bye", "goodbye", "greetings"];
    const clinicalKeywords = ["pain", "hurt", "fever", "throat", "ache", "cough", "breath", "dizzy", "nausea", "vomit", "stomach", "head", "rash", "cold", "flu", "symptom", "illness", "medication", "dose", "allergy", "infection", "blood", "chest", "heart", "temperature", "fatigue", "weakness"];

    let userTurns = 0;
    let hasClinicalContent = false;

    if (messages && messages.length > 0) {
      messages.forEach((m) => {
        if (m.role === "user") {
          userTurns++;
          const clean = m.content.trim().toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");
          const isGreeting = clean.length > 0 && greetingPhrases.some(p => clean === p || clean.startsWith(p + " "));
          if (!isGreeting && clean.length > 5) {
            const containsClinicalWord = clinicalKeywords.some(kw => clean.includes(kw));
            if (containsClinicalWord || clean.length > 20) {
              hasClinicalContent = true;
            }
          }
        }
      });
    } else if (transcript) {
      const cleanTranscript = transcript.toLowerCase();
      hasClinicalContent = clinicalKeywords.some(kw => cleanTranscript.includes(kw)) || transcript.length > 50;
      userTurns = 4;
    }

    if (userTurns <= 3 && !hasClinicalContent) {
      return {
        isAdequate: false,
        reason: "Aegis is still collecting clinical information. To generate a complete and high-quality summary, please ensure the conversation includes substantial details about the patient's symptoms, duration, history, or current concerns."
      };
    }

    if (!hasClinicalContent) {
      return {
        isAdequate: false,
        reason: "The conversation does not contain substantial medical concerns or symptoms yet. Please discuss the patient's symptoms or clinical history before generating a summary."
      };
    }

    return { isAdequate: true, reason: "" };
  }, [messages, transcript]);

  const isPatientInfoMissing = useCallback(() => {
    return !patientData.name || !patientData.age || !patientData.sex;
  }, [patientData]);

  const handleStartGeneration = useCallback(async (overridingPatientData?: typeof patientData) => {
    setState("ANALYZING");
    setStepIndex(0);
    setErrorMsg(null);

    // Step 1: Analyzing
    await new Promise((r) => setTimeout(r, 600));
    setStepIndex(1);
    setState("STRUCTURING");

    try {
      const activePatientInfo = overridingPatientData || patientData;
      const res = await fetch("/api/clinical/generate-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          model,
          messages,
          transcript,
          elevenlabsConversationId,
          patientInfo: activePatientInfo,
        }),
      });

      setStepIndex(2);
      setState("GENERATING");

      const data = await res.json();
      if (!res.ok || !data.ok || !data.summary) {
        throw new Error(data.error || "Failed to generate clinical summary.");
      }

      await new Promise((r) => setTimeout(r, 500));

      setSummary(data.summary);
      setStepIndex(3);
      setState("READY");
    } catch (err: unknown) {
      console.error("Clinical summary generation error:", err);
      setState("ERROR");
      setErrorMsg(err instanceof Error ? err.message : "Unable to generate summary at this time.");
    }
  }, [conversationId, model, messages, transcript, elevenlabsConversationId, patientData]);

  const handleTriggerSummaryFlow = useCallback(() => {
    const status = getConversationStatus();
    if (!status.isAdequate) {
      setAdequacyReason(status.reason);
      setState("EMPTY_ERROR");
      return;
    }

    if (isPatientInfoMissing()) {
      setIsCollectingBiodata(true);
    } else {
      void handleStartGeneration();
    }
  }, [getConversationStatus, isPatientInfoMissing, handleStartGeneration]);

  const handleSaveBiodataAndGenerate = useCallback(async () => {
    if (!patientData.name || !patientData.age || !patientData.sex) {
      return;
    }

    setIsCollectingBiodata(false);

    // Persist patient-info in database
    if (conversationId && conversationId.length > 5) {
      try {
        await fetch(`/api/cases/${conversationId}/patient-info`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patientData),
        });
      } catch (err) {
        console.warn("Failed to persist patient-info in db:", err);
      }
    }

    // Start generating summary with this patientData
    void handleStartGeneration(patientData);
  }, [conversationId, patientData, handleStartGeneration]);

  const handleDownloadPdf = useCallback(async () => {
    if (!summary) return;
    setIsDownloading(true);

    try {
      const res = await fetch("/api/clinical/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary }),
      });

      if (!res.ok) {
        throw new Error("Failed to generate PDF download stream.");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Hippocrates_Clinical_Summary_${summary.documentId || "doc"}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF download failed:", err);
    } finally {
      setIsDownloading(false);
    }
  }, [summary]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/15 backdrop-blur-md">
        {/* Decorative multi-layer glowing ambient blur circles behind the glass container */}
        <div className="absolute w-[360px] h-[360px] rounded-full bg-blue-300/30 blur-[90px] pointer-events-none -z-10 animate-pulse duration-[6000ms]" style={{ top: "20%", left: "25%" }} />
        <div className="absolute w-[320px] h-[320px] rounded-full bg-emerald-300/25 blur-[80px] pointer-events-none -z-10 animate-pulse duration-[4000ms]" style={{ bottom: "20%", right: "25%" }} />
        
        <motion.div
          initial={{ opacity: 0, y: 15, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 15, scale: 0.98 }}
          className="relative w-full max-w-lg rounded-3xl bg-white/80 border border-white/90 backdrop-blur-xl shadow-[0_32px_80px_-16px_rgba(26,39,68,0.12)] overflow-hidden p-6 space-y-6 text-slate-800"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 border-b border-slate-200/50 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600/10 text-emerald-600">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-serif font-bold text-slate-900 tracking-tight">
                  Clinical Summary & Care Plan
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  AI-Assisted Patient Document Generator
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100/60 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* EMPTY_ERROR State */}
          {state === "EMPTY_ERROR" && (
            <div className="space-y-5 text-center py-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-500/10">
                <AlertCircle className="h-7 w-7" />
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-serif font-bold text-slate-900">
                  Insufficient Information
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                  {adequacyReason || "Not enough clinical information was provided to generate a meaningful health summary. Please discuss the patient's symptoms or clinical history first."}
                </p>
              </div>

              <div className="pt-2 flex justify-center">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-850 text-white transition-all shadow-sm cursor-pointer"
                >
                  Close & Continue Conversation
                </button>
              </div>
            </div>
          )}

          {/* COLLECT_BIODATA State */}
          {state !== "EMPTY_ERROR" && isCollectingBiodata && (
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <h3 className="text-sm font-serif font-bold text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-emerald-600" />
                  <span>Complete Patient Health Profile</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Provide basic health details to personalize your clinical summary and care plan.
                </p>
              </div>

              <div className="space-y-3.5 max-h-[360px] overflow-y-auto pr-1">
                {/* Row 1: Name, Age, Sex */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Jane Doe"
                      value={patientData.name}
                      onChange={(e) => setPatientData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 bg-white/50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Age *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 42"
                      value={patientData.age}
                      onChange={(e) => setPatientData(prev => ({ ...prev, age: e.target.value }))}
                      className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 bg-white/50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Sex *
                    </label>
                    <select
                      required
                      value={patientData.sex}
                      onChange={(e) => setPatientData(prev => ({ ...prev, sex: e.target.value }))}
                      className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 bg-white/50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500"
                    >
                      <option value="">Select...</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Optional Clinical Context fields */}
                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Prior Medical History <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <textarea
                      placeholder="e.g. Hypertension, Type-2 Diabetes"
                      value={patientData.history}
                      onChange={(e) => setPatientData(prev => ({ ...prev, history: e.target.value }))}
                      className="w-full text-xs rounded-xl border border-slate-200 px-3 py-1.5 h-14 bg-white/50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Current Medications <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <textarea
                      placeholder="e.g. Metformin 500mg daily"
                      value={patientData.medications}
                      onChange={(e) => setPatientData(prev => ({ ...prev, medications: e.target.value }))}
                      className="w-full text-xs rounded-xl border border-slate-200 px-3 py-1.5 h-14 bg-white/50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Known Allergies <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <textarea
                      placeholder="e.g. Penicillin, Pollen"
                      value={patientData.allergies}
                      onChange={(e) => setPatientData(prev => ({ ...prev, allergies: e.target.value }))}
                      className="w-full text-xs rounded-xl border border-slate-200 px-3 py-1.5 h-14 bg-white/50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-slate-200/40">
                <button
                  type="button"
                  onClick={() => setIsCollectingBiodata(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 hover:bg-slate-100/60 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveBiodataAndGenerate}
                  disabled={!patientData.name || !patientData.age || !patientData.sex}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Save & Generate Summary</span>
                </button>
              </div>
            </div>
          )}

          {/* IDLE State */}
          {state === "IDLE" && !isCollectingBiodata && (
            <div className="space-y-5 text-center py-2">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/10">
                <FileText className="h-7 w-7" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-serif font-bold text-slate-900">
                  Ready to compile clinical record
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                  Aegis will synthesize key symptoms, clinical observations, guidance, and medication notes into a downloadable PDF summary.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50/60 border border-slate-200/60 text-[11px] text-slate-600 text-left flex items-start gap-2.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)]">
                <Info className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Incomplete fields will be marked as not provided. Does not fabricate unmentioned medical data or prescriptions.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 hover:bg-slate-100/60 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleTriggerSummaryFlow}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Generate Health Summary</span>
                </button>
              </div>
            </div>
          )}

          {/* PROGRESS States */}
          {(state === "ANALYZING" || state === "STRUCTURING" || state === "GENERATING") && (
            <div className="space-y-6 py-4">
              <div className="flex flex-col items-center justify-center text-center space-y-3">
                <div className="relative flex items-center justify-center h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/10">
                  <Loader2 className="h-8 w-8 text-emerald-600 animate-spin absolute" />
                  <Sparkles className="h-4 w-4 text-emerald-600 absolute" />
                </div>
                <div>
                  <p className="text-sm font-serif font-bold text-slate-900">{steps[stepIndex]}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Synthesizing clinical observations & formatting PDF
                  </p>
                </div>
              </div>

              {/* Progress Steps Indicator with Glowing Glass capsules */}
              <div className="space-y-3 px-2">
                {steps.slice(0, 3).map((stepText, idx) => {
                  const isDone = idx < stepIndex;
                  const isCurrent = idx === stepIndex;
                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-3 text-xs p-3.5 rounded-2xl border transition-all ${
                        isDone
                          ? "bg-emerald-500/5 border-emerald-500/10 text-slate-800"
                          : isCurrent
                          ? "bg-white/60 border-emerald-500/30 shadow-sm shadow-emerald-500/5 text-emerald-600 font-bold"
                          : "bg-slate-50/30 border-slate-200/50 text-slate-400"
                      }`}
                    >
                      <div
                        className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${
                          isDone
                            ? "bg-emerald-600 text-white"
                            : isCurrent
                            ? "border-2 border-emerald-600 text-emerald-600 animate-pulse"
                            : "border border-slate-200 text-slate-400"
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <span className="text-[10px] font-bold">{idx + 1}</span>
                        )}
                      </div>
                      <span
                        className={
                          isDone
                            ? "text-slate-700 font-semibold"
                            : isCurrent
                            ? "text-emerald-600 font-bold"
                            : "text-slate-400"
                        }
                      >
                        {stepText}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* READY State - Gorgeous glassmorphic card summary preview and download */}
          {state === "READY" && summary && (
            <div className="space-y-5 py-2">
              <div className="flex items-center gap-3 p-4.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-emerald-500/10 blur-xl pointer-events-none" />
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                <div className="flex-1 relative z-10">
                  <p className="text-xs font-bold uppercase tracking-wider">Clinical Summary Generated</p>
                  <p className="text-xs opacity-90 mt-0.5">ID: {summary.documentId}</p>
                </div>
                <span className="relative z-10 px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-600 text-white shadow-sm">
                  Ready
                </span>
              </div>

              {/* Upgraded Glassmorphic Document Preview Card */}
              <div className="p-5 rounded-3xl border border-white/90 bg-white/80 backdrop-blur-md shadow-[0_16px_40px_-8px_rgba(26,39,68,0.06)] space-y-4 relative overflow-hidden">
                {/* Subtle soft gradient background glow inside the glass card */}
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-emerald-400/5 blur-2xl pointer-events-none" />
                
                <div className="border-b border-slate-200/40 pb-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Generated Document Title
                  </p>
                  <p className="text-base font-bold text-slate-900 font-serif mt-0.5 leading-snug">
                    {summary.conversationTitle || "Clinical Conversation Summary & Care Plan"}
                  </p>
                </div>

                {/* Sub glass panel of details */}
                <div className="grid grid-cols-3 gap-3 text-left">
                  <div className="p-3 rounded-2xl bg-white/65 border border-slate-100 shadow-[0_2px_8px_rgba(26,39,68,0.01)]">
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      Patient
                    </span>
                    <span className="block text-xs font-bold text-slate-850 truncate mt-0.5">
                      {summary.patient?.name || "Not specified"}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-white/65 border border-slate-100 shadow-[0_2px_8px_rgba(26,39,68,0.01)]">
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      Age / Sex
                    </span>
                    <span className="block text-xs font-bold text-slate-850 truncate mt-0.5">
                      {summary.patient?.age && summary.patient?.sex ? `${summary.patient.age} / ${summary.patient.sex}` : "Not specified"}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-white/65 border border-slate-100 shadow-[0_2px_8px_rgba(26,39,68,0.01)]">
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      Key Concern
                    </span>
                    <span className="block text-xs font-bold text-slate-850 truncate mt-0.5">
                      {summary.symptoms?.primarySymptom || summary.consultationReason || "General inquiry"}
                    </span>
                  </div>
                </div>

                {/* Badges for generated sections */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                  <span className="text-[10px] px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-700 font-semibold border border-emerald-500/10">
                    Care Guidance
                  </span>
                  <span className="text-[10px] px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-700 font-semibold border border-emerald-500/10">
                    Clinical Analysis
                  </span>
                  {summary.drNote && (
                    <span className="text-[10px] px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-700 font-semibold border border-emerald-500/10">
                      Dr. Note Included
                    </span>
                  )}
                  {summary.medicationDiscussion && (
                    <span className="text-[10px] px-2.5 py-1 rounded-xl bg-blue-500/10 text-blue-700 font-semibold border border-blue-500/10">
                      Medication Info
                    </span>
                  )}
                </div>
              </div>

              {summary.missingInformationNotice && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/10 text-amber-800 text-xs flex items-start gap-2.5 shadow-sm">
                  <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                  <p className="leading-relaxed">{summary.missingInformationNotice}</p>
                </div>
              )}

              {/* Action Buttons with high contrast, responsive design */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(true)}
                  className="h-12 rounded-2xl border border-slate-200 bg-white/80 hover:bg-slate-100/80 text-slate-800 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:scale-[1.01] active:scale-[0.99] backdrop-blur-sm"
                >
                  <Eye className="h-4 w-4 text-emerald-600" />
                  <span>View Document</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isDownloading}
                  className="h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                >
                  {isDownloading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  <span>Download PDF</span>
                </button>
              </div>

              <div className="flex justify-between items-center pt-2 text-xs border-t border-slate-200/40">
                <button
                  type="button"
                  onClick={() => handleStartGeneration()}
                  className="inline-flex items-center gap-1.5 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Re-compile Summary</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {/* ERROR State */}
          {state === "ERROR" && (
            <div className="space-y-4 py-2">
              <div className="p-3.5 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Summary Generation Failed</p>
                  <p className="mt-1 opacity-90">{errorMsg}</p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-medium border border-slate-200 hover:bg-slate-100/50 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => handleStartGeneration()}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer flex items-center gap-2"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Retry</span>
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Full Document Interactive Preview Modal */}
      {summary && (
        <DocumentPreviewModal
          summary={summary}
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          onDownloadPdf={handleDownloadPdf}
        />
      )}
    </>
  );
}
