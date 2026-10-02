"use client";

import { useState } from "react";
import { Copy, Check, FileText, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ReportAnalysisResult, PatientHandoffSummary } from "@/lib/types";

interface DoctorHandoffModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportResult?: ReportAnalysisResult | null;
  patientQuery?: string;
}

export function DoctorHandoffModal({
  open,
  onOpenChange,
  reportResult,
  patientQuery,
}: DoctorHandoffModalProps) {
  const [copied, setCopied] = useState(false);

  const handoffData: PatientHandoffSummary = {
    chiefComplaint: patientQuery || "Patient laboratory report review and health consultation.",
    symptoms: reportResult?.potential_red_flags || ["Routine lab evaluation"],
    duration: "Current lab report",
    relevantHistory: "Self-submitted medical laboratory report for interpretation.",
    medications: "Not specified",
    allergies: "Not specified",
    reportFindings: (reportResult?.results || []).map(
      (r) => `${r.test_name}: ${r.value} ${r.unit} (Ref: ${r.reference_range}) [${r.status}]`
    ),
    potentialRedFlags: reportResult?.potential_red_flags || [],
    questionsForDoctor: reportResult?.questions_for_doctor || [
      "What are the recommended clinical next steps?",
      "Are follow-up laboratory tests or examinations indicated?",
    ],
    generatedAt: new Date().toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
  };

  const formattedText = `=== HIPPOCRATES PATIENT CLINICAL HANDOFF SUMMARY ===
Generated: ${handoffData.generatedAt}

[CHIEF COMPLAINT & CONTEXT]
${handoffData.chiefComplaint}

[KEY REPORT FINDINGS]
${handoffData.reportFindings.length > 0 ? handoffData.reportFindings.map((f) => `• ${f}`).join("\n") : "No structured lab findings attached."}

[POTENTIAL RED FLAGS / ATTENTION ITEMS]
${handoffData.potentialRedFlags.length > 0 ? handoffData.potentialRedFlags.map((rf) => `⚠️ ${rf}`).join("\n") : "None flagged."}

[PATIENT QUESTIONS FOR CLINICIAN]
${handoffData.questionsForDoctor.map((q) => `? ${q}`).join("\n")}

[AEGIS SUMMARY]
${reportResult?.overall_summary || "Patient consulted Aegis AI for lab result interpretation."}
==================================================`;

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-[1.5rem] glass-strong p-6 sm:p-8">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-hippo-blue/10 text-hippo-blue">
              <FileText className="h-5 w-5" />
            </span>
            <DialogTitle className="font-serif text-2xl font-semibold text-hippo-navy">
              Aegis → Oracle Doctor Handoff
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Structured patient summary ready to copy or share with your treating physician or import into Oracle Core.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 my-4 text-xs sm:text-sm">
          {/* Summary Preview Box */}
          <div className="bg-slate-900 text-slate-100 rounded-xl p-4 font-mono text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap border border-slate-800 shadow-inner max-h-[300px] overflow-y-auto">
            {formattedText}
          </div>

          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 flex items-start gap-2.5 text-xs">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <p className="font-semibold">Clinical Note for Patients:</p>
              <p className="mt-0.5 text-amber-800/90 leading-relaxed">
                You can copy this structured summary and share it with your doctor or physician during your consultation.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-border/50">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            variant="default"
            className="bg-hippo-navy hover:bg-hippo-navy/90 text-white rounded-xl"
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2 text-emerald-400" />
                Copied to Clipboard!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy Structured Summary
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
