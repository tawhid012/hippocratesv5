"use client";

import { X, Download, Shield, AlertTriangle, CheckCircle2, FileText, Printer } from "lucide-react";
import type { NormalizedClinicalSummary } from "@/lib/clinical/types";

interface DocumentPreviewModalProps {
  summary: NormalizedClinicalSummary;
  isOpen: boolean;
  onClose: () => void;
  onDownloadPdf: () => void;
}

export function DocumentPreviewModal({
  summary,
  isOpen,
  onClose,
  onDownloadPdf,
}: DocumentPreviewModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/35 backdrop-blur-md overflow-y-auto">
      {/* Background ambient glowing layout circles */}
      <div 
        className="absolute w-[500px] h-[500px] rounded-full bg-blue-300/30 blur-[120px] pointer-events-none -z-10 animate-pulse duration-[7000ms]" 
        style={{ top: "10%", left: "15%" }} 
      />
      <div 
        className="absolute w-[450px] h-[450px] rounded-full bg-emerald-300/25 blur-[100px] pointer-events-none -z-10 animate-pulse duration-[5000ms]" 
        style={{ bottom: "10%", right: "15%" }} 
      />

      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-white/85 border border-white/90 backdrop-blur-xl shadow-[0_32px_80px_-16px_rgba(26,39,68,0.15)] overflow-hidden">
        {/* Header Bar */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-200/50 bg-white/60 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600/10 text-emerald-600 border border-emerald-500/15">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Clinical Conversation Summary</span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
                  {summary.status}
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">Doc ID: {summary.documentId}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                try {
                  window.print();
                } catch {
                  // Silently ignore if blocked by iframe sandbox
                }
              }}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 bg-white/60 text-slate-700 hover:bg-slate-100/80 transition-colors cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print</span>
            </button>
            <button
              type="button"
              onClick={onDownloadPdf}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] cursor-pointer animate-none"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Document Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-8 bg-slate-50/20 backdrop-blur-md">
          {/* Top Brand Banner */}
          <div className="border-b border-slate-200/60 pb-6 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="font-serif text-2xl font-bold tracking-tight text-slate-900">
                  HIPPOCRATES
                </span>
                <span className="text-[10px] font-bold text-emerald-600 tracking-widest uppercase bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-500/10">
                  AI Clinical Platform
                </span>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {new Date(summary.generatedAt).toLocaleString()}
              </span>
            </div>
            <h1 className="text-xl font-serif font-bold text-slate-900 leading-snug">
              {summary.conversationTitle || "Clinical Conversation Summary & Care Plan"}
            </h1>
          </div>

          {/* Patient & Session Card - Upgraded with premium light glassmorphism */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 rounded-2xl bg-white/65 border border-white/95 shadow-[0_8px_24px_-4px_rgba(26,39,68,0.04)] text-xs relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500/80" />
            
            <div className="space-y-2 pl-3">
              <p className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">Patient Info</p>
              <div className="space-y-1">
                <p><span className="font-medium text-slate-500">Name:</span> <span className="font-semibold text-slate-900">{summary.patient?.name || "Not provided"}</span></p>
                <p><span className="font-medium text-slate-500">Age:</span> <span className="font-semibold text-slate-900">{summary.patient?.age || "Not provided"}</span></p>
                <p><span className="font-medium text-slate-500">Sex:</span> <span className="font-semibold text-slate-900">{summary.patient?.sex || "Not provided"}</span></p>
              </div>
            </div>
            
            <div className="space-y-2 border-t md:border-t-0 md:border-l border-slate-200/40 pt-4 md:pt-0 md:pl-6">
              <p className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">Session Details</p>
              <div className="space-y-1">
                <p><span className="font-medium text-slate-500">Model:</span> <span className="font-semibold text-slate-900">{summary.model}</span></p>
                <p><span className="font-medium text-slate-500">Date:</span> <span className="font-semibold text-slate-900">{new Date(summary.generatedAt).toLocaleDateString()}</span></p>
              </div>
            </div>
            
            <div className="space-y-2 border-t md:border-t-0 md:border-l border-slate-200/40 pt-4 md:pt-0 md:pl-6">
              <p className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">Identifiers</p>
              <div className="space-y-1">
                <p><span className="font-medium text-slate-500">Doc ID:</span> <span className="font-semibold text-slate-900">{summary.documentId}</span></p>
                <p><span className="font-medium text-slate-500">Conv ID:</span> <span className="font-semibold text-slate-900 font-mono text-[10px]">{summary.conversationId.slice(0, 12)}...</span></p>
              </div>
            </div>
          </div>

          {/* Risk Status Badge */}
          {summary.riskStatus && summary.riskStatus !== "UNKNOWN" && (
            <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border text-xs font-bold uppercase tracking-wider ${
              summary.riskStatus === "EMERGENCY"
                ? "bg-red-50 border-red-200 text-red-800"
                : summary.riskStatus === "URGENT"
                ? "bg-amber-50 border-amber-200 text-amber-800"
                : summary.riskStatus === "ROUTINE"
                ? "bg-blue-50 border-blue-200 text-blue-800"
                : "bg-emerald-50 border-emerald-200 text-emerald-800"
            }`}>
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Assessment Status: {summary.riskStatus}</span>
            </div>
          )}

          {/* Clinical Snapshot — Phase 2 at-a-glance section */}
          {summary.clinicalSnapshot && (
            <section className="rounded-2xl border border-emerald-200/60 bg-emerald-50/40 p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-emerald-600" />
                <span>Clinical Snapshot</span>
                <span className="text-[9px] font-medium text-emerald-600/70 ml-1">(At-a-glance for healthcare professionals)</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-2">
                  <div>
                    <p className="font-bold text-slate-700">Primary Concern</p>
                    <p className="text-slate-800 mt-0.5">{summary.clinicalSnapshot.primaryConcern}</p>
                  </div>
                  {summary.clinicalSnapshot.durationSummary && (
                    <div>
                      <p className="font-bold text-slate-700">Duration</p>
                      <p className="text-slate-600 mt-0.5">{summary.clinicalSnapshot.durationSummary}</p>
                    </div>
                  )}
                  {summary.clinicalSnapshot.severitySummary && (
                    <div>
                      <p className="font-bold text-slate-700">Severity</p>
                      <p className="text-slate-600 mt-0.5">{summary.clinicalSnapshot.severitySummary}</p>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  {summary.clinicalSnapshot.keyPositiveFindings.length > 0 && (
                    <div>
                      <p className="font-bold text-slate-700">Key Findings</p>
                      <ul className="mt-0.5 space-y-0.5">
                        {summary.clinicalSnapshot.keyPositiveFindings.map((f, i) => (
                          <li key={i} className="text-slate-700 flex items-start gap-1">
                            <span className="text-emerald-600 font-bold shrink-0">+</span>{f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {summary.clinicalSnapshot.keyNegativeFindings.length > 0 && (
                    <div>
                      <p className="font-bold text-slate-500">Pertinent Negatives</p>
                      <ul className="mt-0.5 space-y-0.5">
                        {summary.clinicalSnapshot.keyNegativeFindings.map((f, i) => (
                          <li key={i} className="text-slate-500 flex items-start gap-1">
                            <span className="text-slate-400 shrink-0">–</span>{f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
              {summary.clinicalSnapshot.urgencyStatement && (
                <div className="pt-3 border-t border-emerald-200/40">
                  <p className="text-xs font-bold text-emerald-800">{summary.clinicalSnapshot.urgencyStatement}</p>
                </div>
              )}
              {summary.clinicalSnapshot.keyClinicalConsideration && (
                <p className="text-[11px] italic text-slate-600 pt-1">{summary.clinicalSnapshot.keyClinicalConsideration}</p>
              )}
            </section>
          )}

          {/* Consultation Reason */}
          <section className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-emerald-600" />
              <span>Reason for Assessment</span>
            </h3>
            <div className="text-sm leading-relaxed bg-white/65 border border-white/95 p-5 rounded-2xl shadow-[0_8px_20px_-6px_rgba(26,39,68,0.03)] text-slate-800">
              {summary.consultationReason}
            </div>
          </section>

          {/* Symptoms */}
          <section className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Presenting Symptoms
            </h3>
            <div className="text-sm space-y-4 bg-white/65 border border-white/95 p-5 rounded-2xl shadow-[0_8px_20px_-6px_rgba(26,39,68,0.03)] text-slate-800">
              <p><span className="font-semibold text-slate-900">Primary Symptom:</span> {summary.symptoms.primarySymptom}</p>
              {(summary.symptoms.duration || summary.symptoms.severity || summary.symptoms.frequency) && (
                <div className="flex gap-4 text-xs bg-slate-50/65 border border-slate-100 p-3 rounded-xl text-slate-600">
                  {summary.symptoms.duration && <div><span className="font-medium text-slate-500">Duration:</span> {summary.symptoms.duration}</div>}
                  {summary.symptoms.severity && <div><span className="font-medium text-slate-500">Severity:</span> {summary.symptoms.severity}</div>}
                  {summary.symptoms.frequency && <div><span className="font-medium text-slate-500">Frequency:</span> {summary.symptoms.frequency}</div>}
                </div>
              )}
              {summary.symptoms.associatedSymptoms && summary.symptoms.associatedSymptoms.length > 0 && (
                <div className="pt-3.5 border-t border-slate-250/50">
                  <p className="text-xs font-bold text-slate-850 mb-2">Associated Symptoms:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {summary.symptoms.associatedSymptoms.map((item, idx) => (
                      <span key={idx} className="text-[11px] px-2.5 py-1 rounded-xl bg-slate-100/70 border border-slate-200/50 text-slate-700 font-medium">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {/* Pertinent Negatives inline with symptoms */}
              {summary.pertinentNegatives && summary.pertinentNegatives.length > 0 && (
                <div className="pt-3.5 border-t border-slate-250/50">
                  <p className="text-xs font-bold text-slate-850 mb-2">Pertinent Negatives (Patient Specifically Denied):</p>
                  <div className="flex flex-wrap gap-1.5">
                    {summary.pertinentNegatives.map((item, idx) => (
                      <span key={idx} className="text-[11px] px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 font-medium line-through decoration-slate-400">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Phase 2: Structured Clinical Considerations */}
          {summary.clinicalConsiderations && summary.clinicalConsiderations.length > 0 ? (
            <section className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Clinical Considerations
              </h3>
              <p className="text-[11px] italic text-slate-500">
                The following are clinical possibilities being considered based on patient-reported information. These are NOT confirmed diagnoses.
              </p>
              <div className="space-y-4">
                {summary.clinicalConsiderations.map((cons, idx) => (
                  <div key={idx} className="p-4 rounded-2xl border border-white/95 bg-white/65 shadow-[0_8px_20px_-6px_rgba(26,39,68,0.03)] space-y-3 text-xs">
                    <p className="font-bold text-slate-900 text-sm">{idx + 1}. {cons.name}</p>
                    {cons.clinicalNote && (
                      <p className="text-slate-600 italic leading-relaxed">{cons.clinicalNote}</p>
                    )}
                    {cons.supportingFeatures.length > 0 && (
                      <div>
                        <p className="font-bold text-slate-700 mb-1">Supporting features:</p>
                        <ul className="space-y-1">
                          {cons.supportingFeatures.map((sf, i) => (
                            <li key={i} className="text-slate-600 flex items-start gap-1.5">
                              <span className="text-emerald-600 font-bold mt-0.5 shrink-0">•</span>{sf}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {cons.uncertaintyNotes.length > 0 && (
                      <div className="pt-2.5 border-t border-slate-100">
                        <p className="font-bold text-slate-500 mb-1">Not established / uncertainty:</p>
                        <ul className="space-y-1">
                          {cons.uncertaintyNotes.map((un, i) => (
                            <li key={i} className="text-slate-400 flex items-start gap-1.5">
                              <span className="shrink-0 mt-0.5">–</span>{un}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ) : summary.clinicalUnderstanding.knownFacts?.length > 0 || summary.clinicalUnderstanding.possibleExplanations?.length > 0 ? (
            <section className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Clinical Understanding (AI Analysis)
              </h3>
              <div className="p-5 rounded-2xl border border-white/95 bg-white/65 shadow-[0_8px_20px_-6px_rgba(26,39,68,0.03)] space-y-4 text-xs">
                {summary.clinicalUnderstanding.knownFacts?.length > 0 && (
                  <div>
                    <p className="font-bold text-slate-900">Known Facts:</p>
                    <ul className="list-disc list-inside text-slate-600 mt-1.5 space-y-1 pl-1">
                      {summary.clinicalUnderstanding.knownFacts.map((fact, idx) => (
                        <li key={idx} className="leading-relaxed">{fact}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {summary.clinicalUnderstanding.possibleExplanations?.length > 0 && (
                  <div className="pt-4 border-t border-slate-250/50">
                    <p className="font-bold text-slate-900">Possible Explanations:</p>
                    <ul className="list-disc list-inside text-slate-600 mt-1.5 space-y-1 pl-1">
                      {summary.clinicalUnderstanding.possibleExplanations.map((exp, idx) => (
                        <li key={idx} className="leading-relaxed">{exp}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          ) : null}

          {/* Dr. Note if present */}
          {summary.drNote && (
            <section className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                DOCTOR / ORACLE CLINICAL HANDOFF
              </h3>

              <div className="p-5 rounded-2xl border border-white/95 bg-white/65 shadow-[0_8px_20px_-6px_rgba(26,39,68,0.03)] space-y-3">
                <p className="text-sm leading-relaxed whitespace-pre-line text-slate-800">
                  {summary.drNote}
                </p>
                <p className="text-[10px] italic text-slate-400 pt-2 border-t border-slate-200/40">
                  AI-generated clinical note — not clinician-authored or independently verified.
                </p>
              </div>
            </section>
          )}

          {/* Information Gaps */}
          {summary.informationGaps && summary.informationGaps.length > 0 && (
            <section className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/60 space-y-3 text-xs">
              <h3 className="font-bold uppercase tracking-wider text-slate-700">
                Information Gaps
              </h3>
              <ul className="list-disc list-inside text-slate-600 space-y-1.5">
                {summary.informationGaps.map((gap, idx) => (
                  <li key={idx} className="leading-relaxed">{gap}</li>
                ))}
              </ul>
            </section>
          )}

          {/* Assessment Limitations */}
          {summary.assessmentLimitations && summary.assessmentLimitations.length > 0 && (
            <section className="p-5 rounded-2xl border border-slate-200/60 bg-white/50 text-[11px] space-y-2.5 text-slate-500">
              <p className="font-bold uppercase tracking-wider text-slate-600">Assessment Limitations</p>
              <ul className="list-disc list-inside space-y-1">
                {summary.assessmentLimitations.map((lim, idx) => (
                  <li key={idx} className="leading-relaxed">{lim}</li>
                ))}
              </ul>
            </section>
          )}

          {/* Care Guidance */}
          <section className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Care & Self-Management Guidance
            </h3>
            <div className="p-5 rounded-2xl border border-white/95 bg-white/65 shadow-[0_8px_20px_-6px_rgba(26,39,68,0.03)]">
              <ul className="space-y-2 text-xs text-slate-700">
                {summary.guidance.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Prescription Draft if present */}
          {summary.hasPrescriptionDraft && summary.prescriptionDraft && summary.prescriptionDraft.length > 0 && (
            <section className="p-6 rounded-2xl border border-rose-200/80 bg-rose-50/60 backdrop-blur-md space-y-4 shadow-sm text-rose-950">
              <div className="flex items-center gap-2 text-rose-800">
                <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider">
                  PRESCRIPTION DRAFT — CLINICIAN REVIEW REQUIRED
                </h3>
              </div>
              <p className="text-[10px] font-bold text-rose-700 uppercase tracking-wider bg-rose-100/70 border border-rose-200/50 px-2.5 py-1 rounded-lg inline-block">
                THIS IS NOT A VALID MEDICAL PRESCRIPTION.
              </p>
              <div className="space-y-3 text-xs divide-y divide-rose-200/30">
                {summary.prescriptionDraft.map((rx, idx) => (
                  <div key={idx} className="pt-3 first:pt-0 space-y-1">
                    <p className="font-bold text-slate-900">{rx.medicine} ({rx.strength || "Unspecified strength"})</p>
                    <p className="text-slate-600 text-[11px]">
                      Route: {rx.route || "Oral"} | Frequency: {rx.frequency || "As directed"} | Duration: {rx.duration || "As directed"}
                    </p>
                    {rx.instructions && <p className="text-slate-600 text-[11px]">Instructions: {rx.instructions}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Safety Warnings */}
          <section className="p-6 rounded-2xl border border-amber-200/80 bg-amber-50/60 backdrop-blur-md space-y-3 shadow-sm text-amber-950">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-2">
              <AlertTriangle className="h-4.5 w-4.5 text-amber-600 shrink-0" />
              <span>Red-Flag / Emergency Guidance</span>
            </h3>
            <ul className="list-disc list-inside text-xs text-amber-900 space-y-2">
              {summary.safetyWarnings.map((warn, idx) => (
                <li key={idx} className="leading-relaxed">{warn}</li>
              ))}
            </ul>
          </section>

          {/* Legal Disclaimer Box */}
          <div className="p-5 rounded-2xl border border-slate-200/60 bg-white/50 text-[11px] space-y-2.5 text-slate-500 shadow-sm">
            <p className="font-bold uppercase tracking-wider text-slate-700">IMPORTANT DISCLAIMER</p>
            <p className="leading-relaxed">{summary.disclaimer}</p>
            <p className="font-semibold text-slate-600 pt-2 border-t border-slate-200/40">{summary.copyright}</p>
          </div>
        </div>


        {/* Footer Actions */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-t border-slate-200/50 bg-white/60 backdrop-blur-md">
          <span className="text-xs text-slate-400 font-medium hidden sm:inline">
            Hippocrates AI Clinical Platform • Doc ID {summary.documentId}
          </span>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-white/60 hover:bg-slate-100/80 text-slate-700 cursor-pointer transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={onDownloadPdf}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] flex items-center gap-2 cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

