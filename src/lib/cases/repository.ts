import "server-only";

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { ChatMessage, ChatAttachment, ReportAnalysisResult } from "@/lib/types";

import type { Json } from "@/lib/supabase/types";

export type WorkspaceType = "oracle" | "aegis";

export interface CaseSummary {
  id: string;
  title: string;
  workspaceType: WorkspaceType;
  model?: string;
  persona?: "doctor" | "patient" | string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string;
  elevenlabsConversationId?: string;
  metadata?: Record<string, unknown>;
}

export interface CaseWithMessages extends CaseSummary {
  messages: ChatMessage[];
}

interface InMemoryCase {
  id: string;
  title: string;
  workspaceType: WorkspaceType;
  model?: string;
  persona?: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string;
  elevenlabsConversationId?: string;
  messages: ChatMessage[];
  metadata?: Record<string, unknown>;
}

const inMemoryCases = new Map<string, InMemoryCase>();

function toChatMessage(row: {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
  metadata?: unknown;
  attachment?: ChatAttachment;
  attachments?: ChatAttachment[];
  reportAnalysis?: ReportAnalysisResult;
  visualAnalysisSummary?: string;
}): ChatMessage {
  const meta = (row.metadata && typeof row.metadata === "object" ? row.metadata : {}) as Record<string, unknown>;
  return {
    id: row.id,
    role: row.role === "system" ? "assistant" : row.role,
    content: row.content,
    timestamp: new Date(row.created_at),
    attachment: row.attachment || (meta.attachment as ChatAttachment | undefined),
    attachments: row.attachments || (meta.attachments as ChatAttachment[] | undefined),
    reportAnalysis: row.reportAnalysis || (meta.reportAnalysis as ReportAnalysisResult | undefined),
    visualAnalysisSummary: row.visualAnalysisSummary || (meta.visualAnalysisSummary as string | undefined),
  };
}

export async function listCases(workspace?: WorkspaceType): Promise<CaseSummary[]> {
  const supabase = createSupabaseServiceClient();
  if (supabase) {
    try {
      let query = supabase
        .from("chat_sessions")
        .select("id, title, workspace_type, model, persona, created_at, updated_at, last_message_at, elevenlabs_conversation_id, metadata")
        .order("last_message_at", { ascending: false });

      if (workspace) {
        query = query.eq("workspace_type", workspace);
      }

      const { data, error } = await query;

      if (!error && data) {
        return data.map((item) => ({
          id: item.id,
          title: item.title,
          workspaceType: (item.workspace_type as WorkspaceType) || "oracle",
          model: item.model || (workspace === "aegis" ? "aegis-core" : "oracle-core"),
          persona: item.persona || (workspace === "aegis" ? "patient" : "doctor"),
          createdAt: item.created_at,
          updatedAt: item.updated_at,
          lastMessageAt: item.last_message_at || item.updated_at,
          elevenlabsConversationId: item.elevenlabs_conversation_id || undefined,
          metadata: (item.metadata as Record<string, unknown>) || undefined,
        }));
      }
    } catch {
      // Fallback to in-memory store
    }
  }

  return Array.from(inMemoryCases.values())
    .filter((c) => !workspace || c.workspaceType === workspace)
    .sort((a, b) => new Date(b.lastMessageAt || b.updatedAt).getTime() - new Date(a.lastMessageAt || a.updatedAt).getTime())
    .map(({ id, title, workspaceType, model, persona, createdAt, updatedAt, lastMessageAt, elevenlabsConversationId, metadata }) => ({
      id,
      title,
      workspaceType,
      model,
      persona,
      createdAt,
      updatedAt,
      lastMessageAt,
      elevenlabsConversationId,
      metadata,
    }));
}

export async function createCase(
  title = "Untitled Session",
  workspace: WorkspaceType = "oracle",
  model?: string,
  persona?: string,
  elevenlabsConversationId?: string,
  predefinedId?: string
): Promise<CaseSummary> {
  const defaultModel = model || (workspace === "aegis" ? "aegis-core" : "oracle-core");
  const defaultPersona = persona || (workspace === "aegis" ? "patient" : "doctor");

  const id = predefinedId || crypto.randomUUID();
  const now = new Date().toISOString();

  // Ultra-fast in-memory registration for microsecond lookups
  const newCase: InMemoryCase = {
    id,
    title,
    workspaceType: workspace,
    model: defaultModel,
    persona: defaultPersona,
    createdAt: now,
    updatedAt: now,
    lastMessageAt: now,
    elevenlabsConversationId,
    messages: [],
  };
  inMemoryCases.set(id, newCase);

  const summary: CaseSummary = {
    id: newCase.id,
    title: newCase.title,
    workspaceType: newCase.workspaceType,
    model: newCase.model,
    persona: newCase.persona,
    createdAt: newCase.createdAt,
    updatedAt: newCase.updatedAt,
    lastMessageAt: newCase.lastMessageAt,
    elevenlabsConversationId: newCase.elevenlabsConversationId,
  };

  const supabase = createSupabaseServiceClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("chat_sessions")
      .upsert(
        {
          id,
          title,
          workspace_type: workspace,
          model: defaultModel,
          persona: defaultPersona,
          elevenlabs_conversation_id: elevenlabsConversationId || null,
          last_message_at: now,
        },
        { onConflict: "id" }
      )
      .select("id, title, workspace_type, model, persona, created_at, updated_at, last_message_at, elevenlabs_conversation_id, metadata")
      .single();

    if (error) {
      console.error("[Repository] Supabase createCase error:", error);
      throw new Error(`Failed to create case in Supabase: ${error.message}`);
    }

    if (data) {
      summary.createdAt = data.created_at;
      summary.updatedAt = data.updated_at;
      summary.lastMessageAt = data.last_message_at;
      summary.metadata = (data.metadata as Record<string, unknown>) || undefined;
    }
  }

  return summary;
}

export async function getCase(caseId: string, workspace?: WorkspaceType): Promise<CaseWithMessages | null> {
  // 1. Primary Source of Truth: Supabase PostgreSQL Database
  const supabase = createSupabaseServiceClient();
  if (supabase) {
    try {
      let query = supabase
        .from("chat_sessions")
        .select("id, title, workspace_type, model, persona, created_at, updated_at, last_message_at, elevenlabs_conversation_id, metadata")
        .eq("id", caseId);

      if (workspace) {
        query = query.eq("workspace_type", workspace);
      }

      const { data: session, error: sessionError } = await query.maybeSingle();

      if (!sessionError && session) {
        const { data: messages, error: messagesError } = await supabase
          .from("chat_messages")
          .select("id, role, content, created_at, metadata")
          .eq("session_id", caseId)
          .order("created_at", { ascending: true });

        if (!messagesError) {
          const parsedMsgs = (messages ?? []).map(toChatMessage);
          const caseObj: CaseWithMessages = {
            id: session.id,
            title: session.title,
            workspaceType: (session.workspace_type as WorkspaceType) || "oracle",
            model: session.model,
            persona: session.persona,
            createdAt: session.created_at,
            updatedAt: session.updated_at,
            lastMessageAt: session.last_message_at,
            elevenlabsConversationId: session.elevenlabs_conversation_id || undefined,
            messages: parsedMsgs,
            metadata: (session.metadata as Record<string, unknown>) || undefined,
          };

          // Cache in memory for rapid subsequent retrieval
          inMemoryCases.set(session.id, { ...caseObj });

          return caseObj;
        }
      }
    } catch (err) {
      console.warn("[Repository] Supabase getCase error, checking cache:", err);
    }
  }

  // 2. Fallback: In-Memory Cache (for offline resilience)
  const cached = inMemoryCases.get(caseId);
  if (cached) {
    if (workspace && cached.workspaceType !== workspace) return null;
    return {
      id: cached.id,
      title: cached.title,
      workspaceType: cached.workspaceType,
      model: cached.model,
      persona: cached.persona,
      createdAt: cached.createdAt,
      updatedAt: cached.updatedAt,
      lastMessageAt: cached.lastMessageAt,
      elevenlabsConversationId: cached.elevenlabsConversationId,
      messages: [...cached.messages],
      metadata: cached.metadata,
    };
  }

  return null;
}

export async function getCaseMetadataOnly(caseId: string): Promise<Record<string, unknown> | undefined> {
  const cached = inMemoryCases.get(caseId);
  if (cached && cached.metadata) return cached.metadata;

  const supabase = createSupabaseServiceClient();
  if (supabase) {
    const { data } = await supabase
      .from("chat_sessions")
      .select("metadata")
      .eq("id", caseId)
      .maybeSingle();
    
    if (data && data.metadata) {
      return data.metadata as Record<string, unknown>;
    }
  }
  return undefined;
}

export async function renameCase(caseId: string, title: string) {
  const newTitle = title.trim() || "Untitled Session";
  
  const supabase = createSupabaseServiceClient();
  if (supabase) {
    const { error } = await supabase
      .from("chat_sessions")
      .update({ title: newTitle })
      .eq("id", caseId);

    if (error) {
      console.error("[Repository] Supabase rename error:", error);
      throw new Error(`Failed to rename case: ${error.message}`);
    }
  }

  const item = inMemoryCases.get(caseId);
  if (item) {
    item.title = newTitle;
    item.updatedAt = new Date().toISOString();
  }
}

export async function updateCaseMetadata(caseId: string, metadata: Record<string, unknown>) {
  const item = inMemoryCases.get(caseId);
  const currentMeta = item?.metadata || {};
  const mergedMeta = { ...currentMeta, ...metadata };

  if (item) {
    item.metadata = mergedMeta;
    item.updatedAt = new Date().toISOString();
  }

  const supabase = createSupabaseServiceClient();
  if (supabase) {
    try {
      await supabase
        .from("chat_sessions")
        .update({ metadata: mergedMeta as Json })
        .eq("id", caseId);
    } catch {
      // Fallback
    }
  }
}

export async function deleteCase(caseId: string) {
  const supabase = createSupabaseServiceClient();
  if (supabase) {
    const { error } = await supabase.from("chat_sessions").delete().eq("id", caseId);
    if (error) {
      console.error("[Repository] Supabase delete error:", error);
      throw new Error(`Failed to delete case: ${error.message}`);
    }
  }

  inMemoryCases.delete(caseId);
}

export async function addCaseMessage(
  caseId: string,
  role: "user" | "assistant" | "system",
  content: string,
  extra?: {
    attachment?: ChatAttachment;
    attachments?: ChatAttachment[];
    reportAnalysis?: ReportAnalysisResult;
    visualAnalysisSummary?: string;
  }
) {
  const metadataObj = (
    extra
      ? JSON.parse(
          JSON.stringify({
            attachment: extra.attachment,
            attachments: extra.attachments,
            reportAnalysis: extra.reportAnalysis,
            visualAnalysisSummary: extra.visualAnalysisSummary,
          })
        )
      : {}
  ) as Json;

  // Always update in-memory cache immediately for microsecond availability
  let item = inMemoryCases.get(caseId);
  if (!item) {
    const now = new Date().toISOString();
    item = {
      id: caseId,
      title: "Untitled Session",
      workspaceType: "oracle",
      createdAt: now,
      updatedAt: now,
      lastMessageAt: now,
      messages: [],
    };
    inMemoryCases.set(caseId, item);
  }

  const msgId = crypto.randomUUID();
  const now = new Date();
  const chatMsg: ChatMessage = {
    id: msgId,
    role: role === "system" ? "assistant" : role,
    content,
    timestamp: now,
    attachment: extra?.attachment,
    attachments: extra?.attachments,
    reportAnalysis: extra?.reportAnalysis,
    visualAnalysisSummary: extra?.visualAnalysisSummary,
  };

  item.messages.push(chatMsg);
  item.updatedAt = now.toISOString();
  item.lastMessageAt = now.toISOString();

  const supabase = createSupabaseServiceClient();
  if (supabase) {
    const nowIso = now.toISOString();

    const { error: sessionError } = await supabase
      .from("chat_sessions")
      .upsert(
        {
          id: caseId,
          title: item?.title || "New Health Consultation",
          workspace_type: (item?.workspaceType as WorkspaceType) || "aegis",
          model: item?.model || "aegis-core",
          persona: item?.persona || "patient",
          last_message_at: nowIso,
          updated_at: nowIso,
        },
        { onConflict: "id", ignoreDuplicates: true }
      );
      
    if (sessionError) {
      console.error("[Repository] Supabase session upsert error:", sessionError);
      throw new Error(`Failed to upsert session in Supabase: ${sessionError.message}`);
    }

    const { data, error: msgError } = await supabase
      .from("chat_messages")
      .insert({
        id: msgId,
        session_id: caseId,
        role,
        content,
        metadata: metadataObj,
      })
      .select("id, role, content, created_at, metadata")
      .single();

    if (msgError) {
      console.error("[Repository] Supabase message insert error:", msgError);
      throw new Error(`Failed to insert message in Supabase: ${msgError.message}`);
    }

    if (data) {
      await supabase
        .from("chat_sessions")
        .update({
          updated_at: nowIso,
          last_message_at: nowIso,
        })
        .eq("id", caseId);

      return toChatMessage(data);
    }
  }

  return chatMsg;
}

export async function getOracleHistory(caseId: string) {
  const session = await getCase(caseId, "oracle");
  if (!session) return [];
  return session.messages.slice(-20).map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));
}

export async function getAegisHistory(caseId: string) {
  const session = await getCase(caseId, "aegis");
  if (!session) return [];
  return session.messages.slice(-20).map((msg) => ({
    role: msg.role,
    content: msg.content,
    attachment: msg.attachment,
    attachments: msg.attachments,
    reportAnalysis: msg.reportAnalysis,
    visualAnalysisSummary: msg.visualAnalysisSummary,
  }));
}
