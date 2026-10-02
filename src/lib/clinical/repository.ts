import "server-only";

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { NormalizedClinicalSummary } from "./types";

const inMemoryDocuments = new Map<string, NormalizedClinicalSummary>();

export async function saveClinicalDocument(summary: NormalizedClinicalSummary): Promise<void> {
  // Always cache in memory
  inMemoryDocuments.set(summary.documentId, summary);

  const supabase = createSupabaseServiceClient();
  if (!supabase) return;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from as any)("clinical_documents").insert({
      session_id: summary.conversationId && summary.conversationId.length === 36 ? summary.conversationId : null,
      model: summary.model,
      document_type: "AI_CLINICAL_SUMMARY",
      document_status: summary.status,
      elevenlabs_conversation_id: summary.elevenlabsConversationId || null,
      structured_summary: summary as unknown as Record<string, unknown>,
      created_at: summary.generatedAt,
      updated_at: summary.generatedAt,
    });

    if (error) {
      console.warn("Failed to persist clinical document in Supabase:", error.message);
    }
  } catch (err) {
    console.warn("Error inserting clinical document:", err);
  }
}

export async function getClinicalDocument(documentId: string): Promise<NormalizedClinicalSummary | null> {
  if (inMemoryDocuments.has(documentId)) {
    return inMemoryDocuments.get(documentId) || null;
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) return null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from as any)("clinical_documents")
      .select("structured_summary")
      .eq("structured_summary->>documentId", documentId)
      .maybeSingle();

    if (!error && data && data.structured_summary) {
      const summary = data.structured_summary as unknown as NormalizedClinicalSummary;
      inMemoryDocuments.set(documentId, summary);
      return summary;
    }
  } catch (err) {
    console.warn("Error fetching clinical document:", err);
  }

  return null;
}
