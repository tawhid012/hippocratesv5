import { GoogleGenAI } from "@google/genai";
import type { NormalizedClinicalSummary, ModelType } from "./types";
import { validateClinicalDocument } from "./validateClinicalDocument";
import { getGeminiModelName } from "@/lib/gemini/config";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const DEFAULT_DISCLAIMER =
  "IMPORTANT DISCLAIMER: This document was generated with assistance from Hippocrates AI using information provided during the patient conversation and, where applicable, uploaded health documents. It is intended to organize and explain health information and does not constitute a confirmed medical diagnosis, medical advice, or a legally valid prescription. AI-generated information may contain omissions or inaccuracies and should be reviewed by an appropriately licensed healthcare professional before making clinical or treatment decisions. Seek urgent medical attention for severe or rapidly worsening symptoms.";

const DEFAULT_COPYRIGHT = "© 2026 Hippocrates AI Clinical Platform. All rights reserved.";

/**
 * Generates a clinically meaningful document title from conversation content.
 * Uses the chief complaint and symptom information to produce a title like:
 * "Clinical Assessment — Lower Right Abdominal Pain" rather than a
 * truncated first-message fragment.
 */
export function generateConversationTitle(
  messages: Array<{ role: string; content: string }>,
  chiefComplaint?: string | null
): string {
  // Priority 1: Use an extracted chief complaint if available
  if (chiefComplaint && chiefComplaint.length > 3 && chiefComplaint !== "null") {
    // Convert clinical chief complaint to a clean title
    const clean = chiefComplaint
      .replace(/^(chief complaint:|cc:|presenting with|evaluation of)/i, "")
      .trim();
    const titled = clean.charAt(0).toUpperCase() + clean.slice(1);
    return `Clinical Assessment — ${titled.slice(0, 80)}`;
  }

  const greetingPhrases = [
    "hello", "hi", "hey", "good morning", "good afternoon", "good evening",
    "thanks", "thank you", "okay", "ok", "yes", "no", "sure", "bye", "goodbye",
    "greetings", "howdy", "sup", "can you hear me", "testing"
  ];

  const firstMeaningfulMessage = messages.find((m) => {
    if (m.role !== "user") return false;
    const clean = m.content.trim().toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");
    return clean.length > 5 && !greetingPhrases.some(p => clean === p || clean.startsWith(p + " "));
  });

  if (!firstMeaningfulMessage) {
    return "Aegis Clinical Assessment";
  }

  // Priority 2: Try to extract a clinical phrase from the message
  const content = firstMeaningfulMessage.content.trim();
  
  // Extract the symptom/body area focus (e.g., "stomach pain", "chest pain", "headache")
  const symptomMatch = content.match(/\b(\w+\s+)?(pain|ache|discomfort|pressure|tightness|swelling|rash|fever|cough|nausea|vomiting|bleeding|headache|dizziness|fatigue|shortness of breath|breathlessness|chest)\b/i);
  if (symptomMatch) {
    const symptomPhrase = symptomMatch[0].trim();
    const titled = symptomPhrase.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
    return `Aegis Clinical Assessment — ${titled}`;
  }

  // Priority 3: Intelligent 5-word clinical title from first message
  const cleanContent = content.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");
  const words = cleanContent.split(/\s+/).filter(Boolean);
  const titleWords = words.slice(0, 5).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  return `Aegis Assessment — ${titleWords.join(" ")}`;
}

export interface GenerateSummaryParams {
  conversationId: string;
  model: ModelType;
  messages?: Array<{ role: string; content: string; attachment?: unknown; reportAnalysis?: unknown }>;
  transcript?: string;
  elevenlabsConversationId?: string;
  patientInfo?: {
    name?: string;
    age?: string;
    sex?: string;
    history?: string;
    medications?: string;
    allergies?: string;
  };
  caseState?: unknown;
}

export async function generateClinicalSummary(
  params: GenerateSummaryParams
): Promise<NormalizedClinicalSummary> {
  let {
    conversationId,
    messages = [],
    transcript,
    caseState,
  } = params;
  const {
    model,
    elevenlabsConversationId,
    patientInfo,
  } = params;


  let conversationTitle = "";

  if (elevenlabsConversationId) {
    try {
      console.log(`[AegisPro] Fetching transcript from ElevenLabs for: ${elevenlabsConversationId}`);
      const apiKey = process.env.ELEVENLABS_API_KEY?.trim() || "";
      const elRes = await fetch(`https://api.elevenlabs.io/v1/convai/conversations/${elevenlabsConversationId}`, {
        method: "GET",
        headers: {
          "xi-api-key": apiKey,
        },
        cache: "no-store",
      });

      if (elRes.ok) {
        const elData = await elRes.json();
        const elTranscript = elData.transcript || [];
        
        if (elTranscript.length > 0) {
          console.log(`[AegisPro] Loaded ${elTranscript.length} messages from ElevenLabs.`);
          
          // Map to standard message formats
          const mappedMessages = elTranscript.map((msg: { role: string; message: string; timestamp?: number }) => ({
            role: msg.role === "agent" ? "assistant" : "user",
            content: msg.message || "",
          }));

          // Generate professional clinical title
          conversationTitle = generateConversationTitle(mappedMessages);

          // Use mapped messages as our primary messages array for clinical extraction!
          messages = mappedMessages;
          
          // Reconstruct the transcript text block
          transcript = messages.map(m => `${m.role === "user" ? "PATIENT" : "AEGIS AI"}: ${m.content}`).join("\n");

          // Save/persist to Supabase
          const supabase = createSupabaseServiceClient();
          if (supabase) {
            // Check if chat session already exists with this elevenlabs_conversation_id
            const { data: existingSession } = await supabase
              .from("chat_sessions")
              .select("id, title")
              .eq("elevenlabs_conversation_id", elevenlabsConversationId)
              .maybeSingle();

            let targetSessionId = conversationId;
            if (existingSession) {
              targetSessionId = existingSession.id;
              // If title is "Voice Conversation" or default, update it
              if (!existingSession.title || existingSession.title === "Voice Conversation" || existingSession.title === "Untitled Session") {
                await supabase
                  .from("chat_sessions")
                  .update({ title: conversationTitle })
                  .eq("id", targetSessionId);
              }
            } else {
              // Try to generate a valid UUID for insertion
              const newSessionId = conversationId && conversationId.length === 36 ? conversationId : crypto.randomUUID();
              targetSessionId = newSessionId;
              
              const { error: sessionError } = await supabase
                .from("chat_sessions")
                .insert({
                  id: newSessionId,
                  title: conversationTitle,
                  workspace_type: "aegis",
                  model: "aegis-pro", // Save model identifier as aegis-pro
                  persona: "patient",
                  elevenlabs_conversation_id: elevenlabsConversationId,
                  metadata: { patientInfo: patientInfo || {} },
                });

              if (sessionError) {
                console.warn("[AegisPro] Error inserting chat session in Supabase:", sessionError);
              }
            }

            // Update conversationId to match the Supabase UUID
            conversationId = targetSessionId;

            // Delete any existing messages for this session to avoid duplicates, then bulk insert
            await supabase
              .from("chat_messages")
              .delete()
              .eq("session_id", conversationId);

            const messagesToInsert = elTranscript.map((msg: { role: string; message: string; timestamp?: number }, idx: number) => {
              // Generate absolute timestamps spaced by index to preserve chronological order
              const messageTime = new Date(Date.now() - (elTranscript.length - idx) * 1000).toISOString();
              return {
                id: crypto.randomUUID(),
                session_id: conversationId,
                role: msg.role === "agent" ? "assistant" : "user",
                content: msg.message || "",
                status: "completed",
                created_at: messageTime,
                updated_at: messageTime,
              };
            });

            const { error: messagesError } = await supabase
              .from("chat_messages")
              .insert(messagesToInsert);

            if (messagesError) {
              console.warn("[AegisPro] Error inserting chat messages in Supabase:", messagesError);
            } else {
              console.log(`[AegisPro] Successfully persisted ${messagesToInsert.length} messages in Supabase for session: ${conversationId}`);
            }
          }
        }
      } else {
        console.warn(`[AegisPro] Failed to fetch ElevenLabs transcript. Status: ${elRes.status}`);
      }
    } catch (e) {
      console.error("[AegisPro] Failed fetching and persisting ElevenLabs voice transcript:", e);
    }
  }

  // Load Case State from Supabase if not provided in params
  let finalCaseState = caseState as Record<string, unknown> | undefined;
  if (!finalCaseState && conversationId) {
    try {
      const supabase = createSupabaseServiceClient();
      if (supabase) {
        const { data: session } = await supabase
          .from("chat_sessions")
          .select("metadata")
          .eq("id", conversationId)
          .maybeSingle();
        if (session?.metadata && (session.metadata as Record<string, unknown>).aegisCaseState) {
          finalCaseState = (session.metadata as Record<string, unknown>).aegisCaseState as Record<string, unknown>;
        }
      }
    } catch {}
  }

  // Defensive validation: prevent cross-consultation state carryover
  if (finalCaseState && typeof finalCaseState.consultation_id === "string" && finalCaseState.consultation_id && finalCaseState.consultation_id !== conversationId) {
    console.warn(`[GenerateSummary] Quarantine: Case state consultation_id (${finalCaseState.consultation_id}) does not match active conversationId (${conversationId}). Discarding.`);
    finalCaseState = undefined;
  }

  // Generate conversationTitle from Case State chief complaint or messages
  const caseChiefComplaint = finalCaseState?.chief_complaint
    ? String(finalCaseState.chief_complaint)
    : undefined;
  if (!conversationTitle && (caseChiefComplaint || messages.length > 0)) {
    conversationTitle = generateConversationTitle(messages, caseChiefComplaint);
  }

  // Build complete conversation and state text payload
  let fullText = "";

  if (patientInfo) {
    fullText += `PATIENT BIODATA PROVIDED:\n`;
    if (patientInfo.name) fullText += `- Name: ${patientInfo.name}\n`;
    if (patientInfo.age) fullText += `- Age: ${patientInfo.age}\n`;
    if (patientInfo.sex) fullText += `- Sex: ${patientInfo.sex}\n`;
    if (patientInfo.history) fullText += `- Stated Medical History: ${patientInfo.history}\n`;
    if (patientInfo.medications) fullText += `- Stated Current Medications: ${patientInfo.medications}\n`;
    if (patientInfo.allergies) fullText += `- Stated Known Allergies: ${patientInfo.allergies}\n`;
    fullText += `\n`;
  }

  if (finalCaseState) {
    fullText += `FINAL CLINICAL CASE STATE (SOURCE OF TRUTH):\n${JSON.stringify(finalCaseState, null, 2)}\n\n`;
  }

  if (transcript) {
    fullText += `VOICE TRANSCRIPT:\n${transcript}\n\n`;
  }
  if (messages.length > 0) {
    fullText += "CHAT CONVERSATION HISTORY:\n";
    for (const msg of messages) {
      const roleLabel = msg.role === "user" ? "PATIENT" : "AEGIS AI";
      fullText += `${roleLabel}: ${msg.content}\n`;
      if (msg.reportAnalysis) {
        fullText += `[ATTACHED REPORT ANALYSIS SUMMARY: ${JSON.stringify(msg.reportAnalysis)}]\n`;
      }
    }
  }

  if (!fullText.trim()) {
    fullText = "No detailed conversation messages provided.";
  }

  const prompt = `
You are the clinical synthesis engine for Hippocrates AI (Aegis).
Synthesize the interaction and final Case State below into a structured JSON clinical summary.

=== CORE PRINCIPLES ===

A. CASE STATE AS SOURCE OF TRUTH:
   - Synthesize the FINAL CASE STATE and conversation interaction.
   - Do NOT base the summary primarily on an isolated opening message.
   - If Case State specifies known facts, pertinent negatives, and unmeasured factors, use them directly.

B. THREE-WAY INFORMATION STATE (CRITICAL):
   - KNOWN / PRESENT: Symptoms confirmed present.
   - KNOWN / ABSENT (PERTINENT NEGATIVES): Symptoms explicitly denied by patient (e.g. no vomiting, no feverish feeling, no chills, normal bowel movements, no medical history, no medications). These MUST be preserved in pertinentNegatives.
   - UNKNOWN / UNMEASURED: Objective measurements not performed (e.g. thermometer temperature, physical exam, bloods, imaging).
   - HARD RULE: Unknown ≠ No. Not measured ≠ Normal. If temperature wasn't measured with a thermometer, state "Objective temperature: not measured" (do NOT write "no fever").

C. DOCUMENT TITLE:
   - Generate a clinically synthesized conversationTitle based on the completed assessment (e.g. "Clinical Assessment — Persistent Lower Right Abdominal Pain with Nausea" or "Clinical Assessment — Acute Chest Pressure with Left Arm Radiation").
   - NEVER generate titles from truncated first message fragments like "I've Been Having Stomach Pain Since".

D. STRUCTURED CLINICAL CONSIDERATIONS:
   For each clinicalConsideration entry:
   - name: The condition or category being considered (e.g. "Appendicitis / appendiceal inflammation")
   - supportingFeatures: Specific features supporting this consideration (e.g. RLQ location, movement-related worsening, mild nausea, reduced appetite, local tenderness)
   - uncertaintyNotes: What is missing or cannot be determined without physical examination/tests (e.g. temperature unmeasured, no clinical physical examination, no ultrasound/CT)
   - clinicalNote: One concise sentence summarizing why this is being considered with appropriate uncertainty
   Rules: 2-3 considerations MAX. Clinically plausible only. No confirmed diagnoses.

E. CLINICAL SNAPSHOT:
   Rapid-review block for healthcare professionals (15-second case review):
   - primaryConcern: Main clinical concern in professional language
   - durationSummary: How long symptoms have been present and pattern
   - severitySummary: Severity description (with scale if provided)
   - keyPositiveFindings: Significant reported symptoms/features
   - keyNegativeFindings: Important pertinent negatives (patient-denied findings)
   - urgencyStatement: Clear recommendation on urgency of evaluation
   - keyClinicalConsideration: Single most important consideration sentence with uncertainty

F. DOCTOR / ORACLE HANDOFF (DR. NOTE):
   Optimized specifically for clinician and Oracle consumption. Concise and clinically useful.
   Format:
   CHIEF COMPLAINT: [clinical summary]
   HISTORY: [chronological narrative with onset, progression, current status]
   KEY POSITIVES: [key positive findings]
   KEY NEGATIVES: [important pertinent negatives explicitly denied by patient]
   RELEVANT HISTORY: [prior conditions, current medications, allergies — only if discussed]
   CLINICAL CONSIDERATIONS: [concise considerations with rationale & uncertainty]
   URGENCY: [clinical urgency and recommended timeframe for physical evaluation]
   IMPORTANT INFORMATION GAPS: [only genuinely important clinical unknowns]
   LIMITATIONS: [in-person physical exam not performed; unmeasured vitals/labs]
   SAFETY NOTE: This note was generated by Aegis AI from patient-reported conversation. No physical examination or diagnostic testing was performed. Independent verification by a qualified healthcare professional is required.

G. CARE GUIDANCE (CASE-AWARE ONLY):
   - All guidance must be context-specific to the patient's actual symptoms and urgency.
   - Do NOT include blanket instructions like "avoid eating/drinking" or "do not take painkillers" unless clinically justified for THIS presentation.
   - For mild self-limited conditions (mild tension headache after studying): rest, hydration, monitoring only.
   - For urgent presentations (e.g. RLQ pain / suspected appendicitis): prompt physical evaluation today.

H. INFORMATION GAPS:
   - Only list genuinely important unresolved information relevant to the case and urgency.
   - Do NOT list every generic medical questionnaire item that wasn't asked.

I. RISK STATUS:
   EMERGENCY: Immediate life-threatening risk — call 112 / go to emergency department now
   URGENT: Prompt medical attention warranted same-day or within 24 hours
   ROUTINE: Non-emergency medical assessment appropriate
   SELF_CARE: Manage with general measures plus clear red-flag monitoring
   UNKNOWN: Insufficient information to classify


=== JSON SCHEMA ===

Return ONLY valid JSON. No markdown fences, no extra text:

{
  "conversationTitle": "Clinically meaningful title — NOT a truncated first message",
  "consultationReason": "One-sentence clinical synthesis of the presenting concern",
  "clinicalSnapshot": {
    "primaryConcern": "Main clinical concern in professional language",
    "durationSummary": "Duration and onset pattern",
    "severitySummary": "Severity with scale if provided, or descriptive",
    "keyPositiveFindings": ["Significant reported findings"],
    "keyNegativeFindings": ["Pertinent negatives: patient-denied symptoms"],
    "urgencyStatement": "One clear urgency statement",
    "keyClinicalConsideration": "Single most important consideration sentence with uncertainty"
  },
  "symptoms": {
    "primarySymptom": "Main symptom in clinical language",
    "duration": "Duration or null",
    "severity": "Severity or null",
    "frequency": "Timing/frequency or null",
    "associatedSymptoms": ["Associated symptoms list"],
    "patientObservations": "Any additional patient notes or null"
  },
  "history": {
    "previousConditions": [],
    "currentMedications": [],
    "allergies": [],
    "recentIllnessExposure": null,
    "lifestyleFactors": null,
    "familyHistory": null
  },
  "clinicalUnderstanding": {
    "knownFacts": ["Established clinical facts"],
    "reportedObservations": ["Patient-reported symptoms"],
    "possibleExplanations": ["Differential ideas with hedging language"],
    "uncertainFactors": ["Remaining questions"]
  },
  "clinicalConsiderations": [
    {
      "name": "Condition or category name",
      "supportingFeatures": ["Specific features from the conversation supporting this"],
      "uncertaintyNotes": ["What is missing or cannot be determined without exam/tests"],
      "clinicalNote": "One sentence summary of why this is being considered"
    }
  ],
  "pertinentNegatives": ["Symptoms explicitly denied by patient"],
  "informationGaps": ["Clinically important information not established"],
  "assessmentLimitations": ["What Aegis could not assess — always include physical examination"],
  "riskStatus": "EMERGENCY | URGENT | ROUTINE | SELF_CARE | UNKNOWN",
  "drNote": "Professional clinical note in the format specified above. Concise. No verbatim conversation copying.",
  "reportFindings": [
    {
      "testName": "Test name",
      "resultValue": "Value",
      "referenceRange": "Ref range or null",
      "interpretation": "Interpretation"
    }
  ],
  "guidance": ["Context-specific practical guidance for this patient"],
  "medicationDiscussion": [],
  "prescriptionDraft": [],
  "safetyWarnings": ["Red flags specific to this patient's presentation"],
  "followUp": {
    "recommendedMonitoring": "Specific monitoring instructions",
    "unansweredQuestions": [],
    "suggestedFollowUp": "Follow-up recommendation",
    "whenToSeekCare": "Specific triggers for urgent evaluation"
  },
  "missingInformationNotice": "Brief note on key missing details, or null"
}

=== CONVERSATION TO ANALYZE ===
${fullText}
`;

  const documentId = `DOC-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const nowIso = new Date().toISOString();

  let extractedData: Partial<NormalizedClinicalSummary> = {};
  const preferredModel = getGeminiModelName();
  const modelsToTry = Array.from(new Set([
    preferredModel,
    "gemini-3.7-flash",
    "gemini-3.1-flash-lite",
    "gemini-3.6-flash",
    "gemini-flash-latest"
  ]));

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      const ai = new GoogleGenAI({ apiKey });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let response: any = null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let lastError: any = null;

      for (const modelToAttempt of modelsToTry) {
        // Skip invalid/non-existent model names
        if (modelToAttempt === "gemini-3.5-flash") {
          continue;
        }

        const maxRetries = 3;
        const baseDelayMs = 500;
        let success = false;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            console.log(`[ClinicalSummary] Attempting extraction with model: ${modelToAttempt} (Attempt ${attempt}/${maxRetries})`);
            response = await ai.models.generateContent({
              model: modelToAttempt,
              contents: prompt,
              config: {
                responseMimeType: "application/json",
                temperature: 0.2,
              },
            });
            if (response && response.text) {
              console.log(`[ClinicalSummary] Extraction successful with model: ${modelToAttempt}`);
              success = true;
              break;
            }
          } catch (err) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const errorObj = err as any;
            const errMsg = errorObj?.message || String(err);
            const isTransient = 
              errMsg.includes("503") || 
              errMsg.includes("UNAVAILABLE") || 
              errMsg.includes("temporary") || 
              errMsg.includes("demand") || 
              errMsg.includes("overloaded") ||
              errorObj?.status === 503 ||
              errorObj?.status === 429 ||
              errorObj?.code === 503 ||
              errorObj?.code === 429;

            if (isTransient && attempt < maxRetries) {
              const delay = baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 200;
              console.warn(`[ClinicalSummary] Transient error for ${modelToAttempt} on attempt ${attempt}. Retrying in ${Math.round(delay)}ms... Error: ${errMsg}`);
              await new Promise(resolve => setTimeout(resolve, delay));
            } else {
              console.warn(`[ClinicalSummary] Model ${modelToAttempt} attempt ${attempt} failed:`, err);
              lastError = err;
              break; // Exit retry loop and proceed to next model fallback
            }
          }
        }

        if (success) {
          break;
        }
      }

      if (response && response.text) {
        extractedData = JSON.parse(response.text) as Partial<NormalizedClinicalSummary>;
      } else if (lastError) {
        throw lastError;
      }
    }
  } catch (err) {
    console.warn("Gemini clinical summary extraction failed, using heuristic extraction:", err);
  }

  // Fallback / Heuristic assembly if extraction was incomplete
  const firstMeaningfulMessage = messages.find(m => {
    if (m.role !== "user") return false;
    const clean = m.content.trim().toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g,"");
    const greetingPhrases = ["hello", "hi", "hey", "good morning", "good afternoon", "good evening", "thanks", "thank you", "okay", "ok", "yes", "no", "sure", "bye", "goodbye"];
    return clean.length > 0 && !greetingPhrases.includes(clean);
  });

  const fallbackText = firstMeaningfulMessage ? firstMeaningfulMessage.content : "General patient health inquiry.";

  // Use LLM-extracted title first, then generate from chief complaint, then heuristic
  const extractedTitle = typeof (extractedData as Record<string, unknown>).conversationTitle === "string"
    ? (extractedData as Record<string, unknown>).conversationTitle as string
    : null;
  if (!conversationTitle && extractedTitle && extractedTitle.length > 5) {
    conversationTitle = extractedTitle;
  }
  // If still empty, regenerate from symptoms/complaint
  if (!conversationTitle) {
    const chiefComplaint = extractedData.symptoms?.primarySymptom ||
      (typeof (extractedData as Record<string, unknown>).consultationReason === "string"
        ? (extractedData as Record<string, unknown>).consultationReason as string : null);
    conversationTitle = generateConversationTitle(messages, chiefComplaint);
  }

  const finalConsultationReason =
    extractedData.consultationReason ||
    (fallbackText.slice(0, 150));

  const finalSymptoms = extractedData.symptoms || {
    primarySymptom: firstMeaningfulMessage ? firstMeaningfulMessage.content.slice(0, 100) : "Not specified",
    associatedSymptoms: [],
  };

  const finalHistory = extractedData.history || {};
  const finalUnderstanding = extractedData.clinicalUnderstanding || {
    knownFacts: [],
    reportedObservations: [finalSymptoms.primarySymptom],
    possibleExplanations: ["Further professional evaluation required."],
    uncertainFactors: ["Full medical history not provided."],
  };

  const finalGuidance =
    extractedData.guidance && extractedData.guidance.length > 0
      ? extractedData.guidance
      : [
          "Rest adequately and stay hydrated.",
          "Monitor symptoms closely over the next 24 to 48 hours.",
          "Consult a licensed clinician if symptoms persist or worsen.",
        ];

  const finalSafetyWarnings =
    extractedData.safetyWarnings && extractedData.safetyWarnings.length > 0
      ? extractedData.safetyWarnings
      : [
          "Seek urgent medical attention if you experience severe difficulty breathing, sudden chest pain, confusion, or other rapid deterioration.",
        ];

  const finalFollowUp = extractedData.followUp || {
    recommendedMonitoring: "Track temperature and symptom duration daily.",
    suggestedFollowUp: "Schedule an appointment with your primary healthcare provider if symptoms do not improve.",
    whenToSeekCare: "Immediate medical evaluation is recommended for severe or worsening symptoms.",
  };

  const prescriptionDraft = extractedData.prescriptionDraft || [];
  const medicationDiscussion = extractedData.medicationDiscussion || [];

  const finalDrNote = extractedData.drNote || (
    messages.length > 0
      ? [
          `CHIEF COMPLAINT: ${finalSymptoms.primarySymptom || "Not specified — patient conversation was non-specific."}`,
          ``,
          `HISTORY OF PRESENTING COMPLAINT: ${finalConsultationReason}`,
          ``,
          `SYMPTOM PROFILE (OPQRST):`,
          `- Onset: ${finalSymptoms.duration ? `Approximately ${finalSymptoms.duration}` : "Not established"}`,
          `- Provocation/Palliation: Not established from available conversation`,
          `- Quality: Not specified`,
          `- Region/Radiation: Not established`,
          `- Severity: ${finalSymptoms.severity || "Not quantified"}`,
          `- Timing: ${finalSymptoms.frequency || "Not established"}`,
          ``,
          `ASSOCIATED SYMPTOMS: ${finalSymptoms.associatedSymptoms && finalSymptoms.associatedSymptoms.length > 0 ? finalSymptoms.associatedSymptoms.join(", ") : "None reported in available conversation."}`,
          ``,
          `PERTINENT NEGATIVES: Not systematically assessed in this conversation.`,
          ``,
          `MEDICAL HISTORY: ${(finalHistory.previousConditions && finalHistory.previousConditions.length > 0) ? finalHistory.previousConditions.join(", ") : "Not provided."}`,
          ``,
          `MEDICATIONS: ${(finalHistory.currentMedications && finalHistory.currentMedications.length > 0) ? finalHistory.currentMedications.join(", ") : "Not provided."}`,
          ``,
          `ALLERGIES: ${(finalHistory.allergies && finalHistory.allergies.length > 0) ? finalHistory.allergies.join(", ") : "Not provided."}`,
          ``,
          `CLINICAL ASSESSMENT: ${finalUnderstanding.possibleExplanations && finalUnderstanding.possibleExplanations.length > 0 ? finalUnderstanding.possibleExplanations.join(" ") : "Insufficient information available for clinical synthesis. In-person clinical evaluation recommended."}`,
          ``,
          `POSSIBLE CLINICAL CONSIDERATIONS: Based on the available patient-reported information, differential considerations cannot be reliably established without further history, physical examination, and appropriate investigations.`,
          ``,
          `INFORMATION GAPS: Comprehensive clinical history including full OPQRST characterisation, review of systems, physical examination findings, vital signs, and relevant investigations were not available from this conversation.`,
          ``,
          `SUGGESTED CLINICAL EVALUATION: A comprehensive in-person clinical evaluation including focused history-taking, physical examination, and appropriate investigations is recommended based on the presenting complaint.`,
          ``,
          `IMPORTANT SAFETY NOTE: This note was generated by Aegis AI from patient-reported conversational data. It is preliminary and unverified. No physical examination or diagnostic testing was performed. All clinical considerations are speculative. Independent verification by a qualified healthcare professional is required before any clinical decision is made.`,
        ].join("\n")
      : undefined
  );

  // Extract Phase 2 fields
  const extractedRaw = extractedData as Record<string, unknown>;
  const extractedClinicalSnapshot = extractedRaw.clinicalSnapshot as Record<string, unknown> | undefined;
  const extractedConsiderations = Array.isArray(extractedRaw.clinicalConsiderations)
    ? extractedRaw.clinicalConsiderations as Array<Record<string, unknown>>
    : null;

  const finalClinicalSnapshot = extractedClinicalSnapshot
    ? {
        primaryConcern: String(extractedClinicalSnapshot.primaryConcern || finalConsultationReason),
        durationSummary: extractedClinicalSnapshot.durationSummary as string | undefined,
        severitySummary: extractedClinicalSnapshot.severitySummary as string | undefined,
        keyPositiveFindings: Array.isArray(extractedClinicalSnapshot.keyPositiveFindings)
          ? extractedClinicalSnapshot.keyPositiveFindings as string[]
          : [],
        keyNegativeFindings: Array.isArray(extractedClinicalSnapshot.keyNegativeFindings)
          ? extractedClinicalSnapshot.keyNegativeFindings as string[]
          : [],
        urgencyStatement: String(extractedClinicalSnapshot.urgencyStatement || "Further evaluation recommended."),
        keyClinicalConsideration: extractedClinicalSnapshot.keyClinicalConsideration as string | undefined,
      }
    : undefined;

  const finalClinicalConsiderations = extractedConsiderations
    ? extractedConsiderations.map(c => ({
        name: String(c.name || "Unspecified"),
        supportingFeatures: Array.isArray(c.supportingFeatures) ? c.supportingFeatures as string[] : [],
        uncertaintyNotes: Array.isArray(c.uncertaintyNotes) ? c.uncertaintyNotes as string[] : [],
        clinicalNote: c.clinicalNote as string | undefined,
      }))
    : undefined;

  const summary: NormalizedClinicalSummary = {
    documentId,
    conversationId,
    elevenlabsConversationId,
    model,
    generatedAt: nowIso,
    version: "2.0.0",
    status: "AI GENERATED",
    patient: patientInfo || extractedData.patient,
    conversationTitle: conversationTitle || undefined,
    consultationReason: finalConsultationReason,
    symptoms: finalSymptoms,
    history: finalHistory,
    clinicalUnderstanding: finalUnderstanding,
    drNote: finalDrNote,
    reportFindings: extractedData.reportFindings,
    guidance: finalGuidance,
    medicationDiscussion: medicationDiscussion.length > 0 ? medicationDiscussion : undefined,
    prescriptionDraft: prescriptionDraft.length > 0 ? prescriptionDraft : undefined,
    safetyWarnings: finalSafetyWarnings,
    followUp: finalFollowUp,
    // Phase 1 structured fields
    pertinentNegatives: Array.isArray(extractedRaw.pertinentNegatives)
      ? extractedRaw.pertinentNegatives as string[]
      : undefined,
    informationGaps: Array.isArray(extractedRaw.informationGaps)
      ? extractedRaw.informationGaps as string[]
      : undefined,
    assessmentLimitations: Array.isArray(extractedRaw.assessmentLimitations)
      ? extractedRaw.assessmentLimitations as string[]
      : ["Physical examination not performed", "Vital signs not measured", "No laboratory tests performed", "No imaging or ECG performed"],
    riskStatus: typeof extractedRaw.riskStatus === "string"
      ? extractedRaw.riskStatus as string
      : undefined,
    // Phase 2 structured fields
    clinicalSnapshot: finalClinicalSnapshot,
    clinicalConsiderations: finalClinicalConsiderations,
    missingInformationNotice:
      extractedData.missingInformationNotice ||
      undefined,
    hasPrescriptionDraft: prescriptionDraft.length > 0,
    disclaimer: DEFAULT_DISCLAIMER,
    copyright: DEFAULT_COPYRIGHT,
  };

  const validation = validateClinicalDocument(summary);
  if (!validation.isValid) {
    console.warn("Clinical summary validation warnings/errors:", validation.errors);
  }

  return summary;
}
