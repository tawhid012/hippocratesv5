import { NextRequest, NextResponse } from "next/server";
import { generatePdfBlob } from "@/lib/clinical/generatePdf";
import { getClinicalDocument } from "@/lib/clinical/repository";
import type { NormalizedClinicalSummary } from "@/lib/clinical/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let summary: NormalizedClinicalSummary | null = body.summary || null;

    if (!summary && body.documentId) {
      summary = await getClinicalDocument(body.documentId);
    }

    if (!summary) {
      return NextResponse.json(
        { ok: false, error: "Valid clinical summary payload or document ID is required." },
        { status: 400 }
      );
    }

    const pdfBlob = generatePdfBlob(summary);
    const arrayBuffer = await pdfBlob.arrayBuffer();

    const fileName = `Hippocrates_Clinical_Summary_${summary.documentId || "doc"}.pdf`;

    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (err: unknown) {
    console.error("Failed to generate clinical PDF:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
