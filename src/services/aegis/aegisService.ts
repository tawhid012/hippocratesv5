import "server-only";

import { getGeminiClient } from "@/lib/gemini/client";
import { getGeminiModelName } from "@/lib/gemini/config";
import { buildSanitizedGeminiContents } from "@/lib/gemini/contents";
import {
  AEGIS_SYSTEM_PROMPT,
  AEGIS_REPORT_PROMPT,
  AEGIS_IMAGE_ANALYSIS_PROMPT,
  AEGIS_SYSTEM_PROMPT_COMPACT,
} from "./aegisSystemPrompt";
import { evaluateSafety } from "@/lib/aegis/safety";
import {
  computeReportHash,
  getCachedReport,
  setCachedReport,
} from "./aegisCache";
import type {
  ReportAnalysisResult,
  SafetyEvaluation,
  LabResultStatus,
  AttachmentCategory,
} from "@/lib/types";
import type { AegisCaseState } from "./aegisCaseState";
import {
  buildCaseStateContext,
  extractInstantaneousCaseUpdates,
  EMPTY_CASE_STATE,
} from "./aegisCaseState";

export interface AegisAttachmentInput {
  fileBase64: string;
  mimeType: string;
  fileName: string;
  fileSize?: number;
  dataUrl?: string;
  attachmentType?: AttachmentCategory;
}

export interface AegisMessageInput {
  role: "user" | "assistant" | "system";
  content: string;
  attachment?: {
    name: string;
    type: string;
    attachmentType?: AttachmentCategory;
  };
  attachments?: Array<{
    name: string;
    type: string;
    attachmentType?: AttachmentCategory;
  }>;
  reportAnalysis?: ReportAnalysisResult;
  visualAnalysisSummary?: string;
}

export interface AegisServiceResponse {
  reply: string;
  safetyEvaluation: SafetyEvaluation;
  reportAnalysis?: ReportAnalysisResult;
  visualAnalysisSummary?: string;
}

export interface AegisStreamChunk {
  type: "delta" | "done_meta";
  text?: string;
  safetyEvaluation?: SafetyEvaluation;
  reportAnalysis?: ReportAnalysisResult;
  visualAnalysisSummary?: string;
}

export class AegisServiceError extends Error {
  userFacingMessage: string;
  constructor(userFacingMessage: string, rawError?: unknown) {
    super(typeof rawError === "string" ? rawError : (rawError as Error)?.message || userFacingMessage);
    this.userFacingMessage = userFacingMessage;
    this.name = "AegisServiceError";
  }
}

function normalizeLabStatus(status: unknown): LabResultStatus {
  if (typeof status === "string") {
    const upper = status.toUpperCase().trim();
    if (
      upper === "LOW" ||
      upper === "HIGH" ||
      upper === "NORMAL" ||
      upper === "CRITICAL" ||
      upper === "ATTENTION"
    ) {
      return upper;
    }
  }
  return "UNKNOWN";
}

function parseJsonSafely(raw: string): Record<string, unknown> | null {
  const jsonMatch = raw.match(/```json\s*([\s\S]*?)\s*```/) || raw.match(/([\{\[][\s\S]*[\}\]])/);
  const target = jsonMatch ? jsonMatch[1] : raw;
  try {
    return JSON.parse(target);
  } catch {
    return null;
  }
}

export function formatReportResponse(fileName: string, analysis: ReportAnalysisResult): string {
  const parts: string[] = [];
  parts.push(`I have analyzed **${fileName}**. Here is a clear summary of your report:\n`);

  if (analysis.overall_summary) {
    parts.push(`### Summary\n${analysis.overall_summary}\n`);
  }

  if (analysis.tests && analysis.tests.length > 0) {
    parts.push(`### Laboratory Results`);
    for (const test of analysis.tests) {
      const statusBadge = test.status ? ` **[${test.status}]**` : "";
      const unitStr = test.unit ? ` ${test.unit}` : "";
      const refStr = test.reference_range ? ` (Ref Range: ${test.reference_range})` : "";
      parts.push(`- **${test.test_name}**: ${test.value}${unitStr}${refStr}${statusBadge}`);
      if (test.explanation) {
        parts.push(`  *${test.explanation}*`);
      }
    }
    parts.push("");
  }

  if (analysis.key_findings && analysis.key_findings.length > 0) {
    parts.push(`### Key Findings`);
    for (const finding of analysis.key_findings) {
      parts.push(`- ${finding}`);
    }
    parts.push("");
  }

  if (analysis.red_flags && analysis.red_flags.length > 0) {
    parts.push(`### Items Requiring Doctor Attention`);
    for (const flag of analysis.red_flags) {
      parts.push(`- ${flag}`);
    }
    parts.push("");
  }

  if (analysis.questions_for_doctor && analysis.questions_for_doctor.length > 0) {
    parts.push(`### Questions for Your Doctor`);
    for (const q of analysis.questions_for_doctor) {
      parts.push(`- ${q}`);
    }
    parts.push("");
  }

  parts.push(
    `---\n*Disclaimer: This analysis helps you understand your medical report in simple terms. It does not replace an official interpretation or medical diagnosis from your doctor.*`
  );

  return parts.join("\n");
}

/**
 * Builds compact conversation context for Aegis to minimize prompt tokens and maximize inference speed.
 */
function buildAegisContents(
  prompt: string,
  history: AegisMessageInput[] = []
) {
  const historyInput = history.map((m) => {
    let extraContext = "";
    if (m.reportAnalysis?.overall_summary) {
      extraContext += `[Report Context: ${m.reportAnalysis.overall_summary}]\n`;
    }
    if (m.visualAnalysisSummary) {
      extraContext += `[Visual Context: ${m.visualAnalysisSummary.slice(0, 150)}...]\n`;
    }
    return {
      role: m.role,
      content: m.content,
      extraContext: extraContext || undefined,
    };
  });

  return buildSanitizedGeminiContents([{ text: prompt.trim() }], historyInput);
}

/**
 * Deterministically strips any internal Clinical Case State headers,
 * raw state enums, or debug sections from patient-facing responses.
 */
export function stripInternalCaseState(text: string): string {
  if (!text) return "";

  let cleaned = text;

  // 1. Remove standard case state update block
  // e.g. ### Current Clinical Case State Update ... up to Urgency Level / Assessment Status Gate
  cleaned = cleaned.replace(
    /(?:#{1,6}\s*)?(?:Current\s+)?Clinical\s+Case\s+State(?:\s+Update)?[\s\S]*?(?:Assessment\s+Status(?:\s+Gate)?:\s*[^\n]+(?:\n+|$)|Urgency\s+Level:\s*[^\n]+(?:\n+|$))/gi,
    ""
  );

  // 2. Remove bracketed section blocks like [CURRENT CLINICAL CASE STATE]
  cleaned = cleaned.replace(
    /={3,}[\s\S]*?CURRENT CLINICAL CASE STATE[\s\S]*?={3,}/gi,
    ""
  );

  cleaned = cleaned.replace(
    /\[\d\.\s*(?:KNOWN\s*\/\s*(?:PRESENT|ABSENT)|UNKNOWN\s*\/\s*UNMEASURED)[^\]]*\][\s\S]*?(?=\n\n|\n[A-Z]|$)/gi,
    ""
  );

  // 3. Line-by-line cleaner for remaining state headers or stray list items
  const lines = cleaned.split("\n");
  const filteredLines: string[] = [];
  let inStateList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (
      /^#{1,6}\s*(?:Current\s+)?Clinical\s+Case\s+State(?:\s+Update)?/i.test(trimmed) ||
      /^(?:Current\s+)?Clinical\s+Case\s+State(?:\s+Update)?:?$/i.test(trimmed) ||
      /^#{1,6}\s*(?:Known\s*\/\s*(?:Present|Absent)|Unknown\s*\/\s*(?:Unmeasured|Not Established))/i.test(trimmed) ||
      /^(?:Known\s*\/\s*(?:Present|Absent)|Unknown\s*\/\s*(?:Unmeasured|Not Established)):?$/i.test(trimmed) ||
      /^(?:Assessment\s+Status(?:\s+Gate)?|Urgency\s+Level)\s*:\s*[A-Za-z_]+/i.test(trimmed)
    ) {
      inStateList = true;
      continue;
    }

    if (inStateList) {
      if (
        /^\s*[-*•]\s*(?:Onset|Location|Quality|Severity|Duration|Timing|Radiation|Known|Unknown|Pertinent|Red\s*Flags?|Medical\s*History|Medications?|Allergies|Fever|Nausea|Light|Sharpness|Throbbing|Pain|Assessment|Urgency)/i.test(line) ||
        /^\s*[-*•]\s*.*:\s*(?:PRESENT|ABSENT|UNKNOWN|UNMEASURED|INCOMPLETE|None|Normal)/i.test(line) ||
        /^\s*[-*•]\s*$/i.test(line) ||
        trimmed === ""
      ) {
        const nextLine = lines[i + 1]?.trim() || "";
        const nextIsSentence =
          nextLine.length > 0 &&
          !nextLine.startsWith("-") &&
          !nextLine.startsWith("*") &&
          !nextLine.startsWith("•") &&
          !nextLine.startsWith("#") &&
          !nextLine.includes(":") &&
          !nextLine.toLowerCase().startsWith("known") &&
          !nextLine.toLowerCase().startsWith("unknown");

        if (trimmed === "" && nextIsSentence) {
          inStateList = false;
        }
        continue;
      } else {
        inStateList = false;
      }
    }

    if (
      /^\s*[*•-]?\s*(?:Assessment\s+Status(?:\s+Gate)?|Urgency\s+Level)\s*:\s*[A-Za-z_]+/i.test(trimmed) ||
      /^\s*[*•-]?\s*(?:Light sensitivity|Temperature|Blood pressure|Severity|Onset|Location|Quality)\s*:\s*(?:UNKNOWN|UNMEASURED|NOT ESTABLISHED)/i.test(trimmed)
    ) {
      continue;
    }

    filteredLines.push(line);
  }

  cleaned = filteredLines.join("\n").replace(/^\n{2,}/, "\n").trim();
  return cleaned;
}

// Helper to stream with automatic model fallback if a candidate encounters temporary 503/404 on first token
async function* streamWithCandidateFallback(
  ai: any,
  models: string[],
  params: { contents: any; config?: any }
): AsyncGenerator<{ text?: string }, void, unknown> {
  let lastError: any = null;
  for (const m of models) {
    let yieldedAny = false;
    try {
      const responseStream = await ai.models.generateContentStream({
        model: m,
        contents: params.contents,
        config: params.config,
      });

      for await (const chunk of responseStream) {
        yieldedAny = true;
        yield chunk;
      }
      return;
    } catch (err: any) {
      lastError = err;
      console.warn(`[Aegis] Model ${m} stream attempt failed (yieldedAny=${yieldedAny}):`, err?.message || err);
      if (yieldedAny) {
        throw err;
      }
    }
  }
  throw lastError || new Error("All candidate models failed to generate content.");
}

/**
 * Streams Aegis responses natively with time-to-first-token optimization.
 */
export async function* askAegisServiceStream(
  userMessage: string,
  history: AegisMessageInput[] = [],
  attachmentsInput?: AegisAttachmentInput | AegisAttachmentInput[],
  apiKey?: string,
  caseState?: AegisCaseState | null
): AsyncGenerator<AegisStreamChunk, void, unknown> {
  const prompt = userMessage.trim();

  // Normalize attachments input
  const attachments: AegisAttachmentInput[] = attachmentsInput
    ? Array.isArray(attachmentsInput)
      ? attachmentsInput
      : [attachmentsInput]
    : [];

  const hasAttachment = attachments.length > 0 && attachments.some((a) => a.fileBase64);

  if (!prompt && !hasAttachment) {
    throw new AegisServiceError("Please enter a health question or attach a file.");
  }

  let ai;
  try {
    ai = await getGeminiClient(apiKey);
  } catch (err) {
    throw new AegisServiceError("Aegis is not configured. Please set the Gemini API key in the Admin Panel.", err);
  }

  const preferredModel = getGeminiModelName();
  const candidateModels = Array.from(new Set([
    preferredModel,
    "gemini-3.7-flash",
    "gemini-3.1-flash-lite",
    "gemini-3.6-flash",
    "gemini-flash-latest"
  ]));
  let safetyEval = evaluateSafety(prompt);

  const isImageAnalysis = attachments.some(
    (a) => a.attachmentType === "medical_image" || (a.mimeType.startsWith("image/") && a.attachmentType !== "lab_report")
  );

  // -------------------------------------------------------------
  // PATH A: Multimodal Physical Health Image Analysis (Streaming)
  // -------------------------------------------------------------
  if (hasAttachment && isImageAnalysis) {
    try {
      const parts: Array<
        | { inlineData: { mimeType: string; data: string } }
        | { text: string }
      > = [];

      for (const img of attachments) {
        if (img.fileBase64 && img.mimeType.startsWith("image/")) {
          // Remove potential data URL header if present
          const base64Data = img.fileBase64.replace(/^data:[^;]+;base64,/, "");
          parts.push({
            inlineData: {
              mimeType: img.mimeType,
              data: base64Data,
            },
          });
        }
      }

      const patientQuery = prompt ? `Patient's question: ${prompt}` : "Patient uploaded physical health photograph(s) for visual assessment.";
      parts.push({ text: patientQuery });

      const contents = buildSanitizedGeminiContents(
        parts,
        history.map((m) => ({ role: m.role, content: m.content }))
      );

      const responseStream = streamWithCandidateFallback(ai, candidateModels, {
        contents,
        config: {
          systemInstruction: `${AEGIS_SYSTEM_PROMPT}\n\n${AEGIS_IMAGE_ANALYSIS_PROMPT}`,
        },
      });

      let fullVisualReply = "";
      for await (const chunk of responseStream) {
        const text = chunk.text;
        if (text) {
          fullVisualReply += text;
          yield { type: "delta", text };
        }
      }

      yield {
        type: "done_meta",
        safetyEvaluation: safetyEval,
        visualAnalysisSummary: fullVisualReply,
      };
      return;
    } catch (error: unknown) {
      throw new AegisServiceError(
        "Aegis was unable to process the uploaded image. Please ensure good lighting and try again.",
        error
      );
    }
  }

  // -------------------------------------------------------------
  // PATH B: Lab / Medical Report Analysis (Structured Fast Extraction)
  // -------------------------------------------------------------
  if (hasAttachment && !isImageAnalysis) {
    const primaryAttachment = attachments[0];
    const fileName = primaryAttachment.fileName || "Medical Report";
    const tStart = Date.now();

    try {
      const isPdf = primaryAttachment.mimeType.includes("pdf");
      const isImage = primaryAttachment.mimeType.includes("image");
      const base64Data = primaryAttachment.fileBase64.replace(/^data:[^;]+;base64,/, "");

      // 1. Check in-memory deduplication cache
      const cacheHash = computeReportHash(base64Data, prompt);
      const cached = getCachedReport(cacheHash);

      if (cached) {
        const formatted = cached.formattedReply;
        const chunkSize = 80;
        for (let i = 0; i < formatted.length; i += chunkSize) {
          yield { type: "delta", text: formatted.slice(i, i + chunkSize) };
        }

        const metrics = {
          cached: true,
          totalMs: Date.now() - tStart,
        };

        yield {
          type: "done_meta",
          safetyEvaluation: cached.safetyEvaluation,
          reportAnalysis: {
            ...cached.reportAnalysis,
            metrics,
          },
        };
        return;
      }

      // 2. Multimodal parts preparation
      const parts: Array<
        | { inlineData: { mimeType: string; data: string } }
        | { text: string }
      > = [];

      if (isImage || isPdf) {
        parts.push({
          inlineData: {
            mimeType: primaryAttachment.mimeType,
            data: base64Data,
          },
        });
      }

      parts.push({
        text: `${AEGIS_REPORT_PROMPT}\n\nPatient Note: ${prompt || "Analyze this report and return structured JSON."}`,
      });

      // 3. True streaming generation from Gemini with JSON response schema
      const streamResponse = streamWithCandidateFallback(ai, candidateModels, {
        contents: [{ role: "user", parts }],
        config: {
          responseMimeType: "application/json",
        },
      });

      let rawOutput = "";
      let firstTokenMs: number | null = null;

      for await (const chunk of streamResponse) {
        const text = chunk.text;
        if (text) {
          if (firstTokenMs === null) {
            firstTokenMs = Date.now() - tStart;
          }
          rawOutput += text;
        }
      }

      const totalGenMs = Date.now() - tStart;
      let reportAnalysis: ReportAnalysisResult | undefined = undefined;
      const parsed = parseJsonSafely(rawOutput.trim());

      if (parsed) {
        const resultsSource = Array.isArray(parsed.results)
          ? parsed.results
          : Array.isArray(parsed.tests)
          ? parsed.tests
          : [];

        const tests = resultsSource.map((r) => ({
          test_name: (r.test_name as string) || "Test",
          value: String(r.value || "N/A"),
          unit: (r.unit as string) || "",
          reference_range: (r.reference_range as string) || "N/A",
          status: normalizeLabStatus(r.status),
          explanation: (r.explanation as string) || "",
          requires_medical_review: Boolean(r.requires_medical_review),
        }));

        const redFlags = Array.isArray(parsed.potential_red_flags)
          ? (parsed.potential_red_flags as string[])
          : Array.isArray(parsed.red_flags)
          ? (parsed.red_flags as string[])
          : [];

        reportAnalysis = {
          report_type: (parsed.report_type as string) || "Medical Report",
          patient_name_or_id: (parsed.patient_name_or_id as string) || "Anonymous",
          report_date: (parsed.report_date as string) || "Unknown",
          lab_name: (parsed.lab_name as string) || "Laboratory",
          overall_summary: (parsed.overall_summary as string) || "Report analyzed successfully.",
          key_findings: Array.isArray(parsed.key_findings) ? (parsed.key_findings as string[]) : [],
          red_flags: redFlags,
          potential_red_flags: redFlags,
          questions_for_doctor: Array.isArray(parsed.questions_for_doctor) ? (parsed.questions_for_doctor as string[]) : [],
          tests,
          results: tests,
          metrics: {
            ttftMs: firstTokenMs || 0,
            extractionMs: totalGenMs,
            totalMs: Date.now() - tStart,
            cached: false,
          },
        };
      } else {
        reportAnalysis = {
          report_type: "Medical Report",
          tests: [],
          results: [],
          overall_summary: rawOutput || "Report uploaded and reviewed.",
          key_findings: [rawOutput],
          red_flags: [],
          potential_red_flags: [],
          questions_for_doctor: [],
          metrics: {
            ttftMs: firstTokenMs || 0,
            extractionMs: totalGenMs,
            totalMs: Date.now() - tStart,
            cached: false,
          },
        };
      }

      const formattedReply = formatReportResponse(fileName, reportAnalysis);

      // Stream the formatted response in chunks for immediate responsive rendering
      const chunkSize = 60;
      for (let i = 0; i < formattedReply.length; i += chunkSize) {
        yield { type: "delta", text: formattedReply.slice(i, i + chunkSize) };
      }

      if (reportAnalysis.red_flags && reportAnalysis.red_flags.length > 0) {
        const flagEval = evaluateSafety(reportAnalysis.red_flags.join(" "));
        if (flagEval.level === "POTENTIAL_EMERGENCY") {
          safetyEval = flagEval;
        }
      }

      // Save to cache for instant future reuse
      setCachedReport(cacheHash, reportAnalysis, safetyEval, formattedReply);

      yield {
        type: "done_meta",
        safetyEvaluation: safetyEval,
        reportAnalysis,
      };
      return;
    } catch (error: unknown) {
      throw new AegisServiceError(
        "Aegis was unable to process the uploaded report. Please try again with a clear image or PDF.",
        error
      );
    }
  }

  // -------------------------------------------------------------
  // PATH C: Conversational Follow-Up Turn (Ultra-fast Streaming)
  // -------------------------------------------------------------
  const contents = buildAegisContents(prompt, history);

  // Instantly extract clinical updates from the latest message so Aegis is fully state-aware on this exact turn
  const activeCaseState = extractInstantaneousCaseUpdates(
    prompt,
    caseState || EMPTY_CASE_STATE
  );

  // Build system instruction: compact prompt + instantaneous state context with 3-way tracking & operational gates
  const systemInstruction = `${AEGIS_SYSTEM_PROMPT_COMPACT}\n\n${buildCaseStateContext(activeCaseState)}`;

  try {
    const responseStream = streamWithCandidateFallback(ai, candidateModels, {
      contents,
      config: {
        systemInstruction,
        temperature: 0.5,
      },
    });

    let fullReply = "";
    let initialBuffer = "";
    let hasFlushedHeader = false;

    for await (const chunk of responseStream) {
      const text = chunk.text;
      if (!text) continue;
      fullReply += text;

      if (!hasFlushedHeader) {
        initialBuffer += text;
        const trimmed = initialBuffer.trimStart();
        const looksLikeDebugHeader =
          /^(?:#{1,6}\s*)?(?:Current\s+)?Clinical\s+Case\s+State/i.test(trimmed) ||
          /^(?:\[\s*)?CURRENT CLINICAL CASE STATE/i.test(trimmed) ||
          /^(?:#{1,6}\s*)?Known\s*\/\s*(?:Present|Absent)/i.test(trimmed) ||
          /^(?:\[\s*)?INTERNAL CLINICAL/i.test(trimmed);

        if (looksLikeDebugHeader) {
          if (initialBuffer.includes("\n\n") || initialBuffer.length > 250) {
            const cleaned = stripInternalCaseState(initialBuffer);
            if (cleaned.length > 0) {
              hasFlushedHeader = true;
              yield { type: "delta", text: cleaned };
              initialBuffer = "";
            }
          }
        } else {
          hasFlushedHeader = true;
          yield { type: "delta", text: initialBuffer };
          initialBuffer = "";
        }
      } else {
        yield { type: "delta", text };
      }
    }

    if (!hasFlushedHeader && initialBuffer) {
      const remainingCleaned = stripInternalCaseState(initialBuffer);
      if (remainingCleaned) {
        yield { type: "delta", text: remainingCleaned };
      }
    }

    yield {
      type: "done_meta",
      safetyEvaluation: safetyEval,
    };
  } catch (error: unknown) {
    const errStr = String((error as Error)?.stack || (error as Error)?.message || error);
    if (errStr.includes("API_KEY_INVALID") || errStr.includes("API key not valid") || errStr.includes("MISSING_GEMINI_API_KEY")) {
      throw new AegisServiceError("Aegis is temporarily unable to connect. Please check configuration. " + errStr);
    }
    throw new AegisServiceError("Aegis is temporarily unable to respond. Please try again. " + errStr);
  }
}

/**
 * Handles patient health queries, report analysis, and multimodal physical health image analysis (non-streaming fallback).
 */
export async function askAegisService(
  userMessage: string,
  history: AegisMessageInput[] = [],
  attachmentsInput?: AegisAttachmentInput | AegisAttachmentInput[],
  apiKey?: string,
  caseState?: AegisCaseState | null
): Promise<AegisServiceResponse> {
  let reply = "";
  let safetyEvaluation: SafetyEvaluation = evaluateSafety(userMessage);
  let reportAnalysis: ReportAnalysisResult | undefined;
  let visualAnalysisSummary: string | undefined;

  for await (const chunk of askAegisServiceStream(userMessage, history, attachmentsInput, apiKey, caseState)) {
    if (chunk.type === "delta" && chunk.text) {
      reply += chunk.text;
    } else if (chunk.type === "done_meta") {
      if (chunk.safetyEvaluation) safetyEvaluation = chunk.safetyEvaluation;
      if (chunk.reportAnalysis) reportAnalysis = chunk.reportAnalysis;
      if (chunk.visualAnalysisSummary) visualAnalysisSummary = chunk.visualAnalysisSummary;
    }
  }

  return {
    reply: stripInternalCaseState(reply).trim(),
    safetyEvaluation,
    reportAnalysis,
    visualAnalysisSummary,
  };
}

