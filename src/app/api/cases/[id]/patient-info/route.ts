import { apiError, ok, parseJsonError } from "@/lib/api/response";
import { updateCaseMetadata, getCase } from "@/lib/cases/repository";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  let body: {
    name?: string;
    age?: string;
    sex?: string;
    history?: string;
    medications?: string;
    allergies?: string;
  };

  try {
    body = await request.json();
  } catch {
    return parseJsonError();
  }

  try {
    // Check if case exists
    const caseRecord = await getCase(id);
    if (!caseRecord) {
      return apiError("Session not found.", 404);
    }

    const patientInfo = {
      name: body.name || "",
      age: body.age || "",
      sex: body.sex || "",
      history: body.history || "",
      medications: body.medications || "",
      allergies: body.allergies || "",
    };

    await updateCaseMetadata(id, { patientInfo });

    return ok({ ok: true, patientInfo });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unable to save patient info.";
    return apiError(msg, 500);
  }
}
