import "server-only";

import {
  askAegisService,
  AegisServiceError,
  type AegisMessageInput,
  type AegisAttachmentInput,
  type AegisServiceResponse,
} from "@/services/aegis/aegisService";
import type { ReportAnalysisResult } from "@/lib/types";

export { AegisServiceError as AegisError };

export async function askAegis(
  userMessage: string,
  history: AegisMessageInput[] = [],
  attachment?: AegisAttachmentInput,
  apiKey?: string
): Promise<AegisServiceResponse> {
  return askAegisService(userMessage, history, attachment, apiKey);
}

export async function analyzeMedicalReportWithAI(
  fileBase64?: string,
  mimeType?: string,
  userNotes?: string
): Promise<ReportAnalysisResult> {
  const attachment =
    fileBase64 && mimeType
      ? {
          fileBase64,
          mimeType,
          fileName: "Medical Report",
        }
      : undefined;

  const res = await askAegisService(userNotes || "Analyze medical report", [], attachment);
  return (
    res.reportAnalysis ?? {
      report_type: "Medical Report",
      tests: [],
      results: [],
      overall_summary: res.reply,
      key_findings: [],
      red_flags: [],
      potential_red_flags: [],
      questions_for_doctor: [],
    }
  );
}
