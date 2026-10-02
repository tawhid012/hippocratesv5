/**
 * Provider-agnostic frontend API layer.
 *
 * The browser only talks to Hippocrates API routes. It never calls provider
 * APIs directly and never receives provider names from chat responses.
 */

import type { CaseSummary, CaseWithMessages, ChatRequest, ChatResponse } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api";

interface ApiErrorBody {
  error?: string;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as T & ApiErrorBody;
  if (!response.ok) {
    throw new Error(body.error || "Hippocrates could not complete the request.");
  }
  return body;
}

function reviveChatResponse(response: ChatResponse): ChatResponse {
  return {
    ...response,
    messages: response.messages
      ? {
          user: {
            ...response.messages.user,
            timestamp: new Date(response.messages.user.timestamp),
          },
          assistant: {
            ...response.messages.assistant,
            timestamp: new Date(response.messages.assistant.timestamp),
          },
        }
      : undefined,
  };
}

function reviveCase(caseRecord: CaseWithMessages): CaseWithMessages {
  return {
    ...caseRecord,
    messages: caseRecord.messages.map((message) => ({
      ...message,
      timestamp: new Date(message.timestamp),
    })),
  };
}

export interface StreamCallbacks {
  onInit?: (data: { caseId: string }) => void;
  onDelta?: (delta: string) => void;
  onDone?: (response: ChatResponse) => void;
  onError?: (error: Error) => void;
}

class HippocratesAPI {
  constructor(private readonly baseUrl: string = API_BASE_URL) {}

  async sendMessageStream(request: ChatRequest, callbacks: StreamCallbacks): Promise<void> {
    const isAegis = request.model.startsWith("aegis") || request.persona === "patient";
    const endpoint = isAegis ? `${this.baseUrl}/aegis/chat` : `${this.baseUrl}/oracle/chat`;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          message: request.message,
          caseId: request.caseId,
          attachment: request.attachment,
          attachments: request.attachments,
          attachmentType: request.attachmentType,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Hippocrates could not complete the request.");
      }

      if (!response.body) {
        throw new Error("No response body received from server.");
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
            if (event === "init") {
              callbacks.onInit?.(data);
            } else if (event === "delta") {
              if (data.text) callbacks.onDelta?.(data.text);
            } else if (event === "done") {
              const revived = reviveChatResponse(data as ChatResponse);
              callbacks.onDone?.(revived);
            } else if (event === "error") {
              throw new Error(data.error || "An error occurred during response generation.");
            }
          } catch (jsonErr) {
            if (event === "error") throw jsonErr;
            // Ignore corrupted SSE fragments
          }
        }
      }
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      callbacks.onError?.(errorObj);
      throw errorObj;
    }
  }

  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    const isAegis = request.model.startsWith("aegis") || request.persona === "patient";
    const endpoint = isAegis ? `${this.baseUrl}/aegis/chat` : `${this.baseUrl}/oracle/chat`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: request.message,
        caseId: request.caseId,
        attachment: request.attachment,
        attachments: request.attachments,
        attachmentType: request.attachmentType,
        stream: false,
      }),
    });

    return reviveChatResponse(await parseResponse<ChatResponse>(response));
  }

  async listCases(workspace?: "oracle" | "aegis"): Promise<CaseSummary[]> {
    const url = workspace
      ? `${this.baseUrl}/cases?workspace=${encodeURIComponent(workspace)}`
      : `${this.baseUrl}/cases`;
    const response = await fetch(url, { cache: "no-store" });
    const body = await parseResponse<{ cases: CaseSummary[] }>(response);
    return body.cases;
  }

  async createCase(title?: string, workspace: "oracle" | "aegis" = "oracle"): Promise<CaseSummary> {
    const response = await fetch(`${this.baseUrl}/cases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, workspace }),
    });
    const body = await parseResponse<{ case: CaseSummary }>(response);
    return body.case;
  }

  async getCase(caseId: string): Promise<CaseWithMessages> {
    const response = await fetch(`${this.baseUrl}/cases/${caseId}`, { cache: "no-store" });
    const body = await parseResponse<{ case: CaseWithMessages }>(response);
    return reviveCase(body.case);
  }

  async renameCase(caseId: string, title: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/cases/${caseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    await parseResponse<{ success: true }>(response);
  }

  async deleteCase(caseId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/cases/${caseId}`, {
      method: "DELETE",
    });
    await parseResponse<{ success: true }>(response);
  }
}

export const api = new HippocratesAPI();
