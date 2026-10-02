import { apiError, ok, parseJsonError } from "@/lib/api/response";
import { askOracleService, askOracleServiceStream, getUserFacingOracleError } from "@/services/oracle/oracleService";
import {
  addCaseMessage,
  createCase,
  getOracleHistory,
  renameCase,
} from "@/lib/cases/repository";

function deriveCaseTitle(message: string) {
  const compact = message.replace(/\s+/g, " ").trim();
  if (!compact) return "Clinical Case";
  return compact.length > 54 ? `${compact.slice(0, 54)}…` : compact;
}

export async function POST(request: Request) {
  let body: { message?: unknown; caseId?: unknown; stream?: unknown };
  try {
    body = await request.json();
  } catch {
    return parseJsonError();
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) return apiError("Please enter a clinical question or case details.", 400);

  const wantsStream = body.stream !== false;
  const caseIdStr = typeof body.caseId === "string" && body.caseId ? body.caseId : null;
  const isNewCase = !caseIdStr;

  try {
    const finalCaseId = caseIdStr || crypto.randomUUID();
    const caseTitle = deriveCaseTitle(message);

    // Fast non-blocking history lookup (hits in-memory cache in microseconds)
    const historyPromise = caseIdStr ? getOracleHistory(caseIdStr) : Promise.resolve([]);

    if (isNewCase) {
      // Create session in background/cache instantly without blocking SSE start
      void createCase(caseTitle, "oracle", "oracle-core", "doctor", undefined, finalCaseId);
    }

    const history = await historyPromise;

    // Start persisting user message in parallel
    const userMsgPromise = addCaseMessage(finalCaseId, "user", message);

    if (!wantsStream) {
      const reply = await askOracleService(message, history);
      const userMessage = await userMsgPromise;
      const assistantMessage = await addCaseMessage(finalCaseId, "assistant", reply);

      if (isNewCase) {
        void renameCase(finalCaseId, caseTitle);
      }

      return ok({
        reply,
        caseId: finalCaseId,
        model: "oracle-core",
        messages: {
          user: userMessage,
          assistant: assistantMessage,
        },
      });
    }

    // High-performance SSE Streaming with zero proxy buffering
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial metadata immediately
          controller.enqueue(
            encoder.encode(`event: init\ndata: ${JSON.stringify({ caseId: finalCaseId })}\n\n`)
          );

          let fullReply = "";
          for await (const chunk of askOracleServiceStream(message, history)) {
            fullReply += chunk;
            controller.enqueue(
              encoder.encode(`event: delta\ndata: ${JSON.stringify({ text: chunk })}\n\n`)
            );
          }

          // Await user message persistence
          const userMessage = await userMsgPromise;
          // Persist assistant message
          const assistantMessage = await addCaseMessage(finalCaseId, "assistant", fullReply);

          if (isNewCase) {
            void renameCase(finalCaseId, caseTitle);
          }

          // Send done event with final metadata
          controller.enqueue(
            encoder.encode(
              `event: done\ndata: ${JSON.stringify({
                caseId: finalCaseId,
                reply: fullReply,
                model: "oracle-core",
                messages: {
                  user: userMessage,
                  assistant: assistantMessage,
                },
              })}\n\n`
            )
          );

          controller.close();
        } catch (err) {
          const errorMsg = getUserFacingOracleError(err);
          controller.enqueue(
            encoder.encode(`event: error\ndata: ${JSON.stringify({ error: errorMsg })}\n\n`)
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
    return apiError(getUserFacingOracleError(error), 500);
  }
}

