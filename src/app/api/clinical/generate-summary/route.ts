import { NextRequest, NextResponse } from "next/server";
import { generateClinicalSummary } from "@/lib/clinical/generateClinicalSummary";
import { saveClinicalDocument } from "@/lib/clinical/repository";
import type { ModelType } from "@/lib/clinical/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      conversationId = crypto.randomUUID(),
      model = "Aegis Core",
      messages = [],
      transcript,
      elevenlabsConversationId,
      patientInfo,
      caseState,
    } = body;

    const summary = await generateClinicalSummary({
      conversationId,
      model: model as ModelType,
      messages,
      transcript,
      elevenlabsConversationId,
      patientInfo,
      caseState,
    });


    // Save in repository / Supabase
    await saveClinicalDocument(summary);

    return NextResponse.json({
      ok: true,
      summary,
    });
  } catch (err: unknown) {
    console.error("Failed to generate clinical summary:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
