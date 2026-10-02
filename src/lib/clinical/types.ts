export type ModelType = "Aegis Core" | "Aegis Pro" | "Aegis Hybrid";
export type DocumentStatus = "AI GENERATED" | "CLINICIAN REVIEWED";

export interface PatientInfo {
  name?: string;
  age?: string;
  sex?: string;
}

export interface PresentingSymptoms {
  primarySymptom: string;
  duration?: string;
  severity?: string;
  frequency?: string;
  associatedSymptoms?: string[];
  patientObservations?: string;
}

export interface RelevantHistory {
  previousConditions?: string[];
  currentMedications?: string[];
  allergies?: string[];
  recentIllnessExposure?: string;
  lifestyleFactors?: string;
  familyHistory?: string;
}

export interface ClinicalUnderstanding {
  knownFacts: string[];
  reportedObservations: string[];
  possibleExplanations: string[];
  uncertainFactors: string[];
}

export interface ReportFinding {
  testName: string;
  resultValue: string;
  referenceRange?: string;
  interpretation?: string;
}

export interface MedicationDiscussionItem {
  medication: string;
  purpose?: string;
  dose?: string;
  frequency?: string;
  duration?: string;
  source?: string;
}

export interface PrescriptionDraftItem {
  medicine: string;
  strength?: string;
  route?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
  notes?: string;
}

export interface FollowUpPlan {
  recommendedMonitoring?: string;
  unansweredQuestions?: string[];
  suggestedFollowUp?: string;
  whenToSeekCare?: string;
}

/**
 * A single structured clinical consideration — one plausible possibility
 * with explicit supporting features and uncertainty notes.
 * Replaces flat possibleExplanations[] for Phase 2 structured output.
 */
export interface ClinicalConsideration {
  name: string;                  // e.g. "Appendicitis / appendiceal inflammation"
  supportingFeatures: string[];  // Why this is being considered
  uncertaintyNotes: string[];    // What is missing or contradicting
  clinicalNote?: string;         // Optional brief summary sentence
}

/**
 * A concise clinical snapshot for rapid-review by healthcare professionals.
 * Designed to convey the full case picture in under 30 seconds.
 */
export interface ClinicalSnapshot {
  primaryConcern: string;
  durationSummary?: string;
  severitySummary?: string;
  keyPositiveFindings: string[];
  keyNegativeFindings: string[];     // Pertinent negatives (patient-denied)
  urgencyStatement: string;          // e.g. "Prompt medical assessment recommended"
  keyClinicalConsideration?: string; // One-line top-level consideration sentence
}

export interface NormalizedClinicalSummary {
  documentId: string;
  conversationId: string;
  elevenlabsConversationId?: string;
  model: ModelType;
  generatedAt: string;
  version: string;
  status: DocumentStatus;

  patient?: PatientInfo;
  conversationTitle?: string;
  consultationReason: string;
  symptoms: PresentingSymptoms;
  history: RelevantHistory;
  clinicalUnderstanding: ClinicalUnderstanding;
  reportFindings?: ReportFinding[];
  drNote?: string;
  guidance: string[];
  medicationDiscussion?: MedicationDiscussionItem[];
  prescriptionDraft?: PrescriptionDraftItem[];
  safetyWarnings: string[];
  followUp: FollowUpPlan;

  // Phase 1 structured fields
  pertinentNegatives?: string[];    // Symptoms specifically denied by patient
  informationGaps?: string[];       // Clinically important unknowns
  assessmentLimitations?: string[]; // What Aegis could not assess
  riskStatus?: string;              // EMERGENCY | URGENT | ROUTINE | SELF_CARE | UNKNOWN

  // Phase 2 structured fields
  clinicalSnapshot?: ClinicalSnapshot;             // At-a-glance summary for professionals
  clinicalConsiderations?: ClinicalConsideration[]; // Structured differential with reasoning

  missingInformationNotice?: string;
  hasPrescriptionDraft: boolean;
  disclaimer: string;
  copyright: string;
}

export type GenerationState = "IDLE" | "ANALYZING" | "STRUCTURING" | "GENERATING" | "READY" | "ERROR";
