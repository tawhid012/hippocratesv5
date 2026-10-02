import { apiError, ok, parseJsonError } from "@/lib/api/response";
import { askAegisService, askAegisServiceStream, AegisServiceError, stripInternalCaseState, type AegisMessageInput } from "@/services/aegis/aegisService";
import {
  addCaseMessage,
  createCase,
  getAegisHistory,
  renameCase,
  getCase,
  getCaseMetadataOnly,
  updateCaseMetadata,
} from "@/lib/cases/repository";
import type { AttachmentCategory, ReportAnalysisResult, SafetyEvaluation } from "@/lib/types";
import { getGeminiClient } from "@/lib/gemini/client";
import { getGeminiModelName } from "@/lib/gemini/config";
import {
  parseCaseStateFromMetadata,
  buildCaseStateMetadataUpdate,
  extractInstantaneousCaseUpdates,
  determineAssessmentStatusFromResponse,
  CASE_STATE_EXTRACTION_PROMPT,
  EMPTY_CASE_STATE,
  createCleanCaseState,
  validateCaseStateIsolation,
  type AegisCaseState,
} from "@/services/aegis/aegisCaseState";

function isGreetingMessage(message: string): boolean {
  const clean = message.trim().toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g,"");
  const greetingPhrases = ["hello", "hi", "hey", "good morning", "good afternoon", "good evening", "thanks", "thank you", "okay", "ok", "yes", "no", "sure", "bye", "goodbye"];
  return clean === "" || greetingPhrases.includes(clean);
}

function isPlaceholderTitle(title: string): boolean {
  const t = title.toLowerCase().trim();
  const placeholders = [
    "untitled session", "untitled case", "untitled", "new session", "patient conversation", 
    "patient health query", "patient health discussion", "hello", "hi", "hey",
    "good morning", "good afternoon", "good evening", "thanks", "thank you", "okay", "ok"
  ];
  return placeholders.includes(t) || t.length < 3;
}

function deriveClinicalCaseTitle(
  state: AegisCaseState,
  rawMessage: string,
  fileName?: string
): string {
  if (fileName) {
    return `Report: ${fileName}`;
  }
  if (state.location && state.chief_complaint) {
    const locLower = state.location.toLowerCase();
    const ccLower = state.chief_complaint.toLowerCase();
    if (ccLower.includes(locLower)) {
      return state.chief_complaint;
    }
    return `${state.location} ${state.chief_complaint}`;
  }
  if (state.chief_complaint) {
    return state.chief_complaint;
  }
  if (state.location) {
    return `${state.location} Health Concern`;
  }
  const compact = rawMessage.replace(/\s+/g, " ").trim();
  if (!compact || isGreetingMessage(compact)) return "Patient Health Discussion";
  return compact.length > 40 ? `${compact.slice(0, 37)}...` : compact;
}

/**
 * Deterministically persists the updated clinical case state to case metadata.
 * Local, instantaneous (<5ms), zero additional LLM requests on the critical path.
 */
async function updateCaseStateAsync(
  caseId: string,
  _conversationText: string,
  currentState: AegisCaseState
): Promise<void> {
  try {
    const updatedState: AegisCaseState = {
      ...currentState,
      consultation_id: caseId,
      turn_count: (currentState.turn_count || 0) + 1,
      last_updated: new Date().toISOString(),
    };

    await updateCaseMetadata(caseId, buildCaseStateMetadataUpdate(updatedState));
  } catch (err) {
    console.warn("[Aegis] Case state metadata update failed (non-critical):", err);
  }
}

export async function POST(request: Request) {
  let body: {
    message?: unknown;
    caseId?: unknown;
    stream?: unknown;
    attachment?: {
      fileBase64?: string;
      mimeType?: string;
      fileName?: string;
      fileSize?: number;
      dataUrl?: string;
      attachmentType?: AttachmentCategory;
    };
    attachments?: Array<{
      fileBase64?: string;
      mimeType?: string;
      fileName?: string;
      fileSize?: number;
      dataUrl?: string;
      attachmentType?: AttachmentCategory;
    }>;
    attachmentType?: AttachmentCategory;
    history?: Array<{
      role: string;
      content: string;
      attachment?: unknown;
      attachments?: unknown[];
    }>;
  };

  try {
    body = await request.json();
  } catch {
    return parseJsonError();
  }

  const rawMessage = typeof body.message === "string" ? body.message.trim() : "";
  const wantsStream = body.stream !== false;
  
  // Normalize incoming attachments
  const incomingList = body.attachments || (body.attachment ? [body.attachment] : []);
  const normalizedAttachments = incomingList
    .filter((a) => a && a.fileBase64)
    .map((a) => ({
      fileBase64: a.fileBase64 || "",
      mimeType: a.mimeType || "application/octet-stream",
      fileName: a.fileName || "Attachment",
      fileSize: a.fileSize,
      dataUrl: a.dataUrl,
      attachmentType: a.attachmentType || body.attachmentType || (a.mimeType?.startsWith("image/") ? "medical_image" : "lab_report"),
    }));

  if (!rawMessage && normalizedAttachments.length === 0) {
    return apiError("Please enter a health question or attach a file.", 400);
  }

  try {
    const caseIdStr = typeof body.caseId === "string" && body.caseId ? body.caseId : null;
    const isNewCase = !caseIdStr;
    const finalCaseId = caseIdStr || crypto.randomUUID();

    // Use client-provided history to skip expensive database queries on the critical path
    const historyPromise: Promise<AegisMessageInput[]> = body.history && Array.isArray(body.history)
      ? Promise.resolve(
          body.history.map((m) => ({
            role: (m.role === "assistant" || m.role === "system" ? m.role : "user") as "user" | "assistant" | "system",
            content: typeof m.content === "string" ? m.content : "",
          }))
        )
      : (caseIdStr ? getAegisHistory(caseIdStr) : Promise.resolve([]));
    const firstAtt = normalizedAttachments[0];

    let initialTitle = "Patient Health Discussion";
    if (firstAtt?.fileName) {
      initialTitle = `Report: ${firstAtt.fileName}`;
    } else if (rawMessage && !isGreetingMessage(rawMessage)) {
      const compact = rawMessage.replace(/\s+/g, " ").trim();
      initialTitle = compact.length > 35 ? `${compact.slice(0, 32)}...` : compact;
    }

    // Ensure case session exists in Supabase
    let caseTitle = initialTitle;
    const initCasePromise = (async () => {
      try {
        const existingCase = caseIdStr ? await getCase(finalCaseId) : null;
        if (!existingCase) {
          await createCase(initialTitle, "aegis", "aegis-core", "patient", undefined, finalCaseId);
        } else {
          caseTitle = existingCase.title;
        }
      } catch (err) {
        console.error("Non-critical background case init error:", err);
      }
    })();

    // Load case state strictly scoped to this consultation — no cross-consultation carryover
    let currentCaseState: AegisCaseState = createCleanCaseState(finalCaseId);
    const caseStateLoadPromise = caseIdStr
      ? getCaseMetadataOnly(caseIdStr).then((meta) => {
          if (meta) {
            const parsed = parseCaseStateFromMetadata(meta);
            currentCaseState = validateCaseStateIsolation(parsed, finalCaseId);
          }
        }).catch(() => {})
      : Promise.resolve();

    const history = await historyPromise;

    // Build user message label
    let userMessageContent = rawMessage;
    if (!userMessageContent && normalizedAttachments.length > 0) {
      if (firstAtt.attachmentType === "medical_image") {
        userMessageContent =
          normalizedAttachments.length > 1
            ? `Uploaded ${normalizedAttachments.length} physical health photos for visual assessment.`
            : `Uploaded photo: ${firstAtt.fileName}`;
      } else {
        userMessageContent = `Uploaded medical report: ${firstAtt.fileName}`;
      }
    }

    const primaryAttachmentObj = firstAtt
      ? {
          name: firstAtt.fileName,
          type: firstAtt.mimeType,
          size: firstAtt.fileSize,
          dataUrl: firstAtt.dataUrl,
          attachmentType: firstAtt.attachmentType,
        }
      : undefined;

    const allAttachmentsObj =
      normalizedAttachments.length > 1
        ? normalizedAttachments.map((a) => ({
            name: a.fileName,
            type: a.mimeType,
            size: a.fileSize,
            dataUrl: a.dataUrl,
            attachmentType: a.attachmentType,
          }))
        : undefined;

    // Prevent duplicate user messages in the DB on retry
    const lastMsg = history.length > 0 ? history[history.length - 1] : null;
    const isRetry = lastMsg && lastMsg.role === "user" && lastMsg.content === userMessageContent;
    
    // Concurrently persist user message (or skip if retry)
    const userMsgPromise = isRetry
      ? Promise.resolve({
          id: `retry-${Date.now()}`,
          role: "user",
          content: userMessageContent,
          timestamp: new Date(),
        })
      : addCaseMessage(finalCaseId, "user", userMessageContent, {
          attachment: primaryAttachmentObj,
          attachments: allAttachmentsObj,
        });

    if (!wantsStream) {
      // Ensure case state is loaded before non-streaming call
      await caseStateLoadPromise;
      currentCaseState = extractInstantaneousCaseUpdates(rawMessage, currentCaseState);

      const aegisRes = await askAegisService(
        rawMessage,
        history,
        normalizedAttachments.length > 0 ? normalizedAttachments : undefined,
        undefined,
        currentCaseState
      );

      const cleanReply = stripInternalCaseState(aegisRes.reply);
      const userMessage = await userMsgPromise;
      const assistantMessage = await addCaseMessage(finalCaseId, "assistant", cleanReply, {
        reportAnalysis: aegisRes.reportAnalysis,
        visualAnalysisSummary: aegisRes.visualAnalysisSummary,
      });

      const clinicalTitle = deriveClinicalCaseTitle(currentCaseState, rawMessage, firstAtt?.fileName);
      if (clinicalTitle && clinicalTitle !== "Patient Health Discussion" && (isNewCase || isPlaceholderTitle(caseTitle))) {
        caseTitle = clinicalTitle;
        await renameCase(finalCaseId, clinicalTitle).catch(() => {});
      } else if (isNewCase) {
        await renameCase(finalCaseId, caseTitle);
      }

      const statusGate = determineAssessmentStatusFromResponse(
        cleanReply,
        currentCaseState.assessment_status || currentCaseState.assessment_completeness || "INCOMPLETE"
      );
      currentCaseState.assessment_status = statusGate;
      currentCaseState.assessment_completeness = statusGate;

      // Update case state asynchronously (non-blocking)
      const convoText = history.map((m: any) => `${m.role === "user" ? "PATIENT" : "AEGIS"}: ${m.content}`).join("\n") +
        `\nPATIENT: ${rawMessage}\nAEGIS: ${cleanReply}`;
      void updateCaseStateAsync(finalCaseId, convoText, currentCaseState);

      return ok({
        reply: cleanReply,
        caseId: finalCaseId,
        model: "aegis-core",
        safetyEvaluation: aegisRes.safetyEvaluation,
        reportAnalysis: aegisRes.reportAnalysis,
        visualAnalysisSummary: aegisRes.visualAnalysisSummary,
        assessmentStatus: statusGate,
        urgencyLevel: currentCaseState.urgency_level || "ROUTINE",
        messages: {
          user: userMessage,
          assistant: assistantMessage,
        },
      });
    }

    // High-performance SSE Streaming
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(
            encoder.encode(`event: init\ndata: ${JSON.stringify({ caseId: finalCaseId })}\n\n`)
          );

          let fullReply = "";
          let finalSafety: SafetyEvaluation | undefined;
          let finalReportAnalysis: ReportAnalysisResult | undefined;
          let finalVisualSummary: string | undefined;

          // Ensure case state is loaded before streaming call
          await caseStateLoadPromise;
          currentCaseState = extractInstantaneousCaseUpdates(rawMessage, currentCaseState);

          for await (const chunk of askAegisServiceStream(
            rawMessage,
            history,
            normalizedAttachments.length > 0 ? normalizedAttachments : undefined,
            undefined,
            currentCaseState
          )) {

            if (chunk.type === "delta" && chunk.text) {
              fullReply += chunk.text;
              controller.enqueue(
                encoder.encode(`event: delta\ndata: ${JSON.stringify({ text: chunk.text })}\n\n`)
              );
            } else if (chunk.type === "done_meta") {
              if (chunk.safetyEvaluation) finalSafety = chunk.safetyEvaluation;
              if (chunk.reportAnalysis) finalReportAnalysis = chunk.reportAnalysis;
              if (chunk.visualAnalysisSummary) finalVisualSummary = chunk.visualAnalysisSummary;
            }
          }

          const cleanStreamReply = stripInternalCaseState(fullReply);

          await initCasePromise;
          const userMessage = await userMsgPromise;
          const assistantMessage = await addCaseMessage(finalCaseId, "assistant", cleanStreamReply, {
            reportAnalysis: finalReportAnalysis,
            visualAnalysisSummary: finalVisualSummary,
          });

          const clinicalTitle = deriveClinicalCaseTitle(currentCaseState, rawMessage, firstAtt?.fileName);
          if (clinicalTitle && clinicalTitle !== "Patient Health Discussion" && (isNewCase || isPlaceholderTitle(caseTitle))) {
            caseTitle = clinicalTitle;
            await renameCase(finalCaseId, clinicalTitle).catch(() => {});
          } else if (isNewCase) {
            await renameCase(finalCaseId, caseTitle).catch(() => {});
          }

          const statusGate = determineAssessmentStatusFromResponse(
            cleanStreamReply,
            currentCaseState.assessment_status || currentCaseState.assessment_completeness || "INCOMPLETE"
          );
          currentCaseState.assessment_status = statusGate;
          currentCaseState.assessment_completeness = statusGate;

          // Update case state asynchronously after response is done (non-blocking)
          const convoText = history.map((m: any) => `${m.role === "user" ? "PATIENT" : "AEGIS"}: ${m.content}`).join("\n") +
            `\nPATIENT: ${rawMessage}\nAEGIS: ${cleanStreamReply}`;
          void updateCaseStateAsync(finalCaseId, convoText, currentCaseState);

          controller.enqueue(
            encoder.encode(
              `event: done\ndata: ${JSON.stringify({
                caseId: finalCaseId,
                reply: cleanStreamReply,
                model: "aegis-core",
                safetyEvaluation: finalSafety,
                reportAnalysis: finalReportAnalysis,
                visualAnalysisSummary: finalVisualSummary,
                assessmentStatus: statusGate,
                urgencyLevel: currentCaseState.urgency_level || "ROUTINE",
                messages: {
                  user: userMessage,
                  assistant: assistantMessage,
                },
              })}\n\n`
            )
          );

          controller.close();
        } catch (err) {
          const msg =
            err instanceof AegisServiceError
              ? err.userFacingMessage + " DETAILS: " + ((err.cause as Error)?.message || String(err.cause))
              : (err as Error)?.message || "Aegis is temporarily unable to respond. Please try again.";
          controller.enqueue(
            encoder.encode(`event: error\ndata: ${JSON.stringify({ error: msg })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform, no-store, must-revalidate",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    if (error instanceof AegisServiceError) {
      return apiError(error.userFacingMessage, 500);
    }
    const msg = error instanceof Error ? error.message : "Aegis is temporarily unable to respond. Please try again.";
    return apiError(msg, 500);
  }
}

