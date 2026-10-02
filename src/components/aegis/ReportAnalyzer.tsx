"use client";

import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Sparkles,
  HelpCircle,
  RefreshCw,
  X,
  Share2,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DoctorHandoffModal } from "./DoctorHandoffModal";
import { optimizeMedicalImageForUpload } from "@/lib/image-optimizer";
import type { ReportAnalysisResult, SafetyEvaluation, LabResultStatus, ReportMetrics } from "@/lib/types";

export function ReportAnalyzer() {
  const [file, setFile] = useState<File | null>(null);
  const [optimizedFileBase64, setOptimizedFileBase64] = useState<string | null>(null);
  const [fileMimeType, setFileMimeType] = useState<string>("application/pdf");
  const [dragActive, setDragActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeStage, setActiveStage] = useState<string>("Ready to analyze");
  const [streamingText, setStreamingText] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const [reportResult, setReportResult] = useState<ReportAnalysisResult | null>(null);
  const [safetyEvaluation, setSafetyEvaluation] = useState<SafetyEvaluation | null>(null);
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [liveMetrics, setLiveMetrics] = useState<ReportMetrics | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProcessFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    setStreamingText("");
    try {
      const opt = await optimizeMedicalImageForUpload(selectedFile);
      setOptimizedFileBase64(opt.base64);
      setFileMimeType(opt.mimeType);
    } catch {
      // Fallback: direct file without pre-optimization
      setOptimizedFileBase64(null);
      setFileMimeType(selectedFile.type || "application/pdf");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleProcessFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.match(/\.(pdf|jpg|jpeg|png|webp)$/i)) {
        handleProcessFile(droppedFile);
      } else {
        setError("Please upload a PDF, JPG, JPEG, or PNG file.");
      }
    }
  };

  const analyzeReport = useCallback(async () => {
    if (!file) return;

    setIsAnalyzing(true);
    setError(null);
    setStreamingText("");
    setActiveStage("Sending document to Aegis engine...");

    const tStart = performance.now();
    let tFirstToken: number | null = null;

    try {
      let base64 = optimizedFileBase64;
      let mimeType = fileMimeType;

      if (!base64) {
        const opt = await optimizeMedicalImageForUpload(file);
        base64 = opt.base64;
        mimeType = opt.mimeType;
        setOptimizedFileBase64(base64);
        setFileMimeType(mimeType);
      }

      setActiveStage("Extracting laboratory findings via Gemini Multimodal...");

      const response = await fetch("/api/aegis/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          fileBase64: base64,
          mimeType,
          fileName: file.name,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to analyze report.");
      }

      if (!response.body) {
        throw new Error("No response stream available.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const block of lines) {
          if (!block.trim()) continue;

          let event = "message";
          let dataStr = "";

          for (const line of block.split("\n")) {
            if (line.startsWith("event: ")) {
              event = line.slice(7).trim();
            } else if (line.startsWith("data: ")) {
              dataStr = line.slice(6).trim();
            }
          }

          if (!dataStr) continue;

          try {
            const data = JSON.parse(dataStr);
            if (event === "stage") {
              setActiveStage(data.message || "Processing report...");
            } else if (event === "delta") {
              if (tFirstToken === null) {
                tFirstToken = performance.now();
                setActiveStage("Streaming clinical insights...");
              }
              if (data.text) {
                setStreamingText((prev) => prev + data.text);
              }
            } else if (event === "safety") {
              if (data.safetyEvaluation) {
                setSafetyEvaluation(data.safetyEvaluation);
              }
            } else if (event === "done") {
              const tTotal = performance.now() - tStart;
              const metrics: ReportMetrics = {
                ...(data.metrics || {}),
                ttftMs: tFirstToken ? Math.round(tFirstToken - tStart) : data.metrics?.ttftMs,
                totalMs: Math.round(tTotal),
              };

              setLiveMetrics(metrics);
              setReportResult(data.reportResult ?? null);
              if (data.safetyEvaluation) {
                setSafetyEvaluation(data.safetyEvaluation);
              }
            } else if (event === "error") {
              throw new Error(data.error || "An error occurred during analysis.");
            }
          } catch (jsonErr) {
            if (event === "error") throw jsonErr;
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Analysis failed.";
      setError(msg);
    } finally {
      setIsAnalyzing(false);
    }
  }, [file, optimizedFileBase64, fileMimeType]);

  const resetAnalyzer = () => {
    setFile(null);
    setOptimizedFileBase64(null);
    setReportResult(null);
    setSafetyEvaluation(null);
    setStreamingText("");
    setLiveMetrics(null);
    setError(null);
  };

  const getStatusBadge = (status: LabResultStatus) => {
    switch (status) {
      case "LOW":
        return (
          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-red-50 text-red-700 border border-red-200">
            🔴 Below reference range
          </span>
        );
      case "HIGH":
        return (
          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
            🟠 Above reference range
          </span>
        );
      case "CRITICAL":
        return (
          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-red-600 text-white font-bold">
            🚨 Critical value
          </span>
        );
      case "ATTENTION":
        return (
          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-300">
            ⚠️ Attention recommended
          </span>
        );
      case "UNKNOWN":
        return (
          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
            ⚪ Range not specified
          </span>
        );
      case "NORMAL":
      default:
        return (
          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
            🟢 Normal range
          </span>
        );
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header section */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full glass-control px-3.5 py-1 text-xs font-semibold text-hippo-blue">
          <Sparkles className="h-3.5 w-3.5 text-accent" />
          <span>Aegis Medical Report Analyzer</span>
        </div>
        <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-hippo-navy">
          Understand Your Laboratory & Medical Reports
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
          Upload your blood test, metabolic panel, or laboratory results (PDF, JPG, PNG) for plain-English explanations, reference range analysis, and red-flag identification.
        </p>
      </div>

      {/* Safety Banner if Emergency Detected */}
      {safetyEvaluation?.level === "POTENTIAL_EMERGENCY" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 sm:p-5 rounded-2xl bg-red-600 text-white shadow-xl flex items-start gap-3.5"
        >
          <AlertCircle className="h-6 w-6 shrink-0 text-white mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-sm sm:text-base">IMMEDIATE EMERGENCY WARNING</h4>
            <p className="text-xs sm:text-sm text-red-100 leading-relaxed">
              {safetyEvaluation.emergencyWarning}
            </p>
          </div>
        </motion.div>
      )}

      {/* Upload Box / Active State */}
      {!reportResult && !isAnalyzing && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`glass-strong rounded-[2rem] p-8 sm:p-12 text-center border-2 border-dashed transition-all duration-200 ${
            dragActive
              ? "border-accent bg-accent/5 scale-[1.01]"
              : "border-border/60 hover:border-accent/50"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            className="hidden"
          />

          {!file ? (
            <div className="space-y-4">
              <div className="h-16 w-16 mx-auto rounded-2xl bg-hippo-blue/10 text-hippo-blue flex items-center justify-center shadow-inner">
                <Upload className="h-8 w-8" strokeWidth={1.75} />
              </div>
              <div className="space-y-1">
                <h3 className="font-serif text-lg font-semibold text-hippo-navy">
                  Drag and drop your report here
                </h3>
                <p className="text-xs text-muted-foreground">
                  Supports PDF, JPG, JPEG, and PNG blood tests, CBC, LFT, KFT, lipid panels, and lab reports.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                className="rounded-xl border-accent/30 text-accent hover:bg-accent/10"
                onClick={() => fileInputRef.current?.click()}
              >
                Browse Document Files
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-center gap-3 p-4 rounded-xl bg-white/80 border border-border shadow-sm max-w-md mx-auto">
                <FileText className="h-8 w-8 text-hippo-blue shrink-0" />
                <div className="text-left min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate text-hippo-navy">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB • Ready for instant analysis
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setOptimizedFileBase64(null);
                  }}
                  className="p-1 rounded-lg text-muted-foreground hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex justify-center gap-3">
                <Button
                  variant="default"
                  size="lg"
                  className="rounded-xl bg-hippo-navy hover:bg-hippo-navy/90 text-white shadow-md px-8"
                  onClick={analyzeReport}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Analyze Medical Report
                </Button>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 flex items-center justify-center gap-2 text-xs font-medium text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200 max-w-md mx-auto">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </motion.div>
      )}

      {/* Live Analysis Pipeline State (Streaming) */}
      {isAnalyzing && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-strong rounded-[2rem] p-6 sm:p-10 space-y-6 max-w-2xl mx-auto border border-white/80 shadow-lg"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-hippo-blue/10 flex items-center justify-center text-hippo-blue">
              <RefreshCw className="h-5 w-5 animate-spin" />
            </div>
            <div className="text-left flex-1 min-w-0">
              <h3 className="font-serif text-lg font-semibold text-hippo-navy">
                Analyzing Medical Document
              </h3>
              <p className="text-xs text-hippo-blue font-medium transition-all">
                {activeStage}
              </p>
            </div>
          </div>

          {/* Real-time Streaming Output Preview */}
          {streamingText && (
            <div className="p-4 rounded-xl bg-white/70 border border-border/60 text-xs text-slate-700 max-h-48 overflow-y-auto space-y-1 font-mono whitespace-pre-wrap">
              <div className="text-[10px] font-sans font-bold uppercase tracking-wider text-muted-foreground pb-1 border-b border-border/40 flex items-center gap-1.5">
                <Zap className="h-3 w-3 text-amber-500" />
                Live Response Stream
              </div>
              <p className="leading-relaxed">{streamingText}</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Report Analysis Results View */}
      {reportResult && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Top Control Bar with Performance Metrics */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl glass-control">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-lg font-semibold text-hippo-navy">
                  {reportResult.report_type || "Laboratory Report Analysis"}
                </h3>
                {liveMetrics && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Zap className="h-3 w-3 text-emerald-600" />
                    {liveMetrics.cached
                      ? "Instant Cache (0ms)"
                      : `${((liveMetrics.totalMs || 0) / 1000).toFixed(1)}s${
                          liveMetrics.ttftMs ? ` (TTFT ${(liveMetrics.ttftMs / 1000).toFixed(1)}s)` : ""
                        }`}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Lab: {reportResult.lab_name || "Extracted Report"} • Date: {reportResult.report_date || "Current"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-hippo-navy/20 text-hippo-navy"
                onClick={() => setHandoffOpen(true)}
              >
                <Share2 className="h-3.5 w-3.5 mr-1.5 text-hippo-blue" />
                Doctor Handoff Summary
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-xl text-muted-foreground"
                onClick={resetAnalyzer}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                New Analysis
              </Button>
            </div>
          </div>

          {/* Overall Summary Card */}
          <div className="p-6 rounded-[1.5rem] glass-strong border border-white/70 space-y-4">
            <div className="flex items-center gap-2 text-hippo-navy font-semibold text-sm">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <span>Overall Plain-English Summary</span>
            </div>
            <p className="text-sm leading-relaxed text-foreground/90">
              {reportResult.overall_summary}
            </p>

            {reportResult.key_findings && reportResult.key_findings.length > 0 && (
              <div className="pt-2 border-t border-border/40">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Key Findings:
                </p>
                <ul className="space-y-1">
                  {reportResult.key_findings.map((kf, i) => (
                    <li key={i} className="text-xs text-foreground/80 flex items-start gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-hippo-blue shrink-0 mt-1.5" />
                      <span>{kf}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Individual Lab Result Test Items */}
          <div className="space-y-3">
            <h4 className="font-serif text-lg font-semibold text-hippo-navy px-1">
              Test Line Items & Reference Ranges
            </h4>

            <div className="grid grid-cols-1 gap-3">
              {reportResult.results && reportResult.results.length > 0 ? (
                reportResult.results.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl glass-strong border border-white/70 space-y-3 transition-all hover:shadow-md"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h5 className="font-semibold text-base text-hippo-navy">
                          {item.test_name}
                        </h5>
                        <p className="text-xs text-muted-foreground">
                          Reference Range: <span className="font-medium text-foreground/80">{item.reference_range || "N/A"}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono text-lg font-bold text-hippo-navy">
                          {item.value} <span className="text-xs font-normal text-muted-foreground">{item.unit}</span>
                        </span>
                        {getStatusBadge(item.status)}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/60 text-xs text-muted-foreground leading-relaxed">
                      <span className="font-semibold text-foreground/90">What this means: </span>
                      {item.explanation}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground p-4 text-center">
                  No individual line items extracted. Please refer to the overall summary above.
                </p>
              )}
            </div>
          </div>

          {/* Potential Red Flags */}
          {reportResult.potential_red_flags && reportResult.potential_red_flags.length > 0 && (
            <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-950 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-sm text-amber-900">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <span>Potential Red Flags / Findings to Note</span>
              </div>
              <ul className="space-y-1 pl-6 list-disc text-xs text-amber-900/90 leading-relaxed">
                {reportResult.potential_red_flags.map((flag, idx) => (
                  <li key={idx}>{flag}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Questions for Doctor */}
          {reportResult.questions_for_doctor && reportResult.questions_for_doctor.length > 0 && (
            <div className="p-5 rounded-2xl glass-strong border border-white/70 space-y-3">
              <div className="flex items-center gap-2 font-semibold text-sm text-hippo-navy">
                <HelpCircle className="h-4 w-4 text-hippo-blue" />
                <span>Recommended Questions to Ask Your Doctor</span>
              </div>
              <ul className="space-y-2 text-xs">
                {reportResult.questions_for_doctor.map((q, idx) => (
                  <li
                    key={idx}
                    className="p-2.5 rounded-xl bg-white/70 border border-border/50 text-foreground/90 flex items-start gap-2"
                  >
                    <span className="font-semibold text-hippo-blue">?</span>
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Disclaimer */}
          <div className="p-4 rounded-xl bg-slate-100/70 border border-slate-200 text-[11px] text-muted-foreground leading-relaxed text-center">
            {reportResult.disclaimer}
          </div>
        </motion.div>
      )}

      {/* Handoff Modal */}
      <DoctorHandoffModal
        open={handoffOpen}
        onOpenChange={setHandoffOpen}
        reportResult={reportResult}
      />
    </div>
  );
}
