import { apiError, ok } from "@/lib/api/response";
import { AegisServiceError, askAegisServiceStream } from "@/services/aegis/aegisService";
import { evaluateSafety } from "@/lib/aegis/safety";
import type { ReportAnalysisResult, SafetyEvaluation } from "@/lib/types";

export async function POST(request: Request) {
  const t0 = Date.now();
  const contentType = request.headers.get("content-type") || "";
  const acceptHeader = request.headers.get("accept") || "";

  try {
    let fileBase64: string | undefined;
    let mimeType: string | undefined;
    let fileName = "Medical Report";
    let textContext = "";
    let wantsStream = acceptHeader.includes("text/event-stream");

    if (contentType.includes("application/json")) {
      const body = await request.json().catch(() => ({}));
      fileBase64 = body.fileBase64;
      mimeType = body.mimeType;
      fileName = body.fileName || "Medical Report";
      textContext = body.textContext || "";
      if (body.stream !== undefined) {
        wantsStream = Boolean(body.stream);
      }
    } else {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      textContext = (formData.get("textContext") as string) || "";
      const streamParam = formData.get("stream");
      if (streamParam === "true" || streamParam === "1") {
        wantsStream = true;
      }

      if (file) {
        fileName = file.name;
        mimeType = file.type || "application/pdf";
        const allowedTypes = [
          "application/pdf",
          "image/jpeg",
          "image/jpg",
          "image/png",
          "image/webp",
        ];

        if (!allowedTypes.includes(mimeType) && !file.name.match(/\.(pdf|jpg|jpeg|png|webp)$/i)) {
          return apiError("Unsupported file format. Please upload PDF, JPG, JPEG, or PNG files.", 400);
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        fileBase64 = buffer.toString("base64");
      }
    }

    if (!fileBase64 && !textContext) {
      return apiError("Please upload a medical report file (PDF, JPG, PNG) or provide report text.", 400);
    }

    const tUpload = Date.now();
    const uploadMs = tUpload - t0;

    // Early deterministic pre-check on textContext if provided
    let earlySafety: SafetyEvaluation = {
      level: "NORMAL",
      reasons: [],
      actionRequired: "Routine Health Information & Follow-up",
    };
    if (textContext) {
      earlySafety = evaluateSafety(textContext);
    }

    const attachment = fileBase64 && mimeType
      ? {
          fileBase64,
          mimeType,
          fileName,
          attachmentType: "lab_report" as const,
        }
      : undefined;

    if (!wantsStream) {
      let finalReportAnalysis: ReportAnalysisResult | undefined;
      let finalSafety: SafetyEvaluation = earlySafety;
      let streamedSummary = "";

      for await (const chunk of askAegisServiceStream(
        textContext || "Analyze this medical report and extract all structured test items.",
        [],
        attachment ? [attachment] : undefined
      )) {
        if (chunk.type === "delta" && chunk.text) {
          streamedSummary += chunk.text;
        } else if (chunk.type === "done_meta") {
          if (chunk.safetyEvaluation) finalSafety = chunk.safetyEvaluation;
          if (chunk.reportAnalysis) finalReportAnalysis = chunk.reportAnalysis;
        }
      }

      const reportResult = finalReportAnalysis ?? {
        report_type: "Medical Report",
        tests: [],
        results: [],
        overall_summary: streamedSummary || "Report analyzed successfully.",
        key_findings: [],
        red_flags: [],
        potential_red_flags: [],
        questions_for_doctor: [],
        metrics: {
          uploadMs,
          totalMs: Date.now() - t0,
        },
      };

      if (reportResult.metrics) {
        reportResult.metrics.uploadMs = uploadMs;
        reportResult.metrics.totalMs = Date.now() - t0;
      }

      return ok({
        reportResult,
        safetyEvaluation: finalSafety,
      });
    }

    // High-performance SSE Streaming mode
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Emit initial stage
          controller.enqueue(
            encoder.encode(
              `event: stage\ndata: ${JSON.stringify({
                stage: "processing",
                message: "Extracting clinical findings and reference ranges...",
                uploadMs,
              })}\n\n`
            )
          );

          if (earlySafety.level === "POTENTIAL_EMERGENCY") {
            controller.enqueue(
              encoder.encode(
                `event: safety\ndata: ${JSON.stringify({ safetyEvaluation: earlySafety })}\n\n`
              )
            );
          }

          let streamedSummary = "";
          let finalSafety: SafetyEvaluation = earlySafety;
          let finalReportAnalysis: ReportAnalysisResult | undefined;
          let tFirstToken: number | null = null;

          for await (const chunk of askAegisServiceStream(
            textContext || "Analyze this medical report and extract all structured test items.",
            [],
            attachment ? [attachment] : undefined
          )) {
            if (chunk.type === "delta" && chunk.text) {
              if (tFirstToken === null) {
                tFirstToken = Date.now() - t0;
              }
              streamedSummary += chunk.text;
              controller.enqueue(
                encoder.encode(`event: delta\ndata: ${JSON.stringify({ text: chunk.text })}\n\n`)
              );
            } else if (chunk.type === "done_meta") {
              if (chunk.safetyEvaluation) finalSafety = chunk.safetyEvaluation;
              if (chunk.reportAnalysis) finalReportAnalysis = chunk.reportAnalysis;
            }
          }

          const totalMs = Date.now() - t0;
          const reportResult: ReportAnalysisResult = finalReportAnalysis ?? {
            report_type: "Medical Report",
            tests: [],
            results: [],
            overall_summary: streamedSummary || "Report analyzed successfully.",
            key_findings: [],
            red_flags: [],
            potential_red_flags: [],
            questions_for_doctor: [],
            metrics: {
              uploadMs,
              ttftMs: tFirstToken ?? undefined,
              totalMs,
            },
          };

          if (reportResult.metrics) {
            reportResult.metrics.uploadMs = uploadMs;
            if (!reportResult.metrics.ttftMs && tFirstToken) {
              reportResult.metrics.ttftMs = tFirstToken;
            }
            reportResult.metrics.totalMs = totalMs;
          }

          controller.enqueue(
            encoder.encode(
              `event: done\ndata: ${JSON.stringify({
                reportResult,
                safetyEvaluation: finalSafety,
                metrics: reportResult.metrics,
              })}\n\n`
            )
          );
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : "Failed to analyze report.";
          controller.enqueue(
            encoder.encode(`event: error\ndata: ${JSON.stringify({ error: errMsg })}\n\n`)
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    if (error instanceof AegisServiceError) {
      return apiError(error.message, 500);
    }
    const msg = error instanceof Error ? error.message : "Failed to analyze medical report.";
    return apiError(msg, 500);
  }
}
