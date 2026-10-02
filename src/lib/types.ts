export type UserPersona = "doctor" | "patient";

export type OracleModel = "oracle-core" | "oracle-pro" | "oracle-research";
export type AegisModel = "aegis-core" | "aegis-pro" | "aegis-research";
export type AIModelId = OracleModel | AegisModel;

export interface AIModelDefinition {
  id: AIModelId;
  name: string;
  description: string;
  status: "available" | "coming_soon";
}

export type MessageRole = "user" | "assistant";

export type AttachmentCategory = "lab_report" | "medical_image";

export interface ChatAttachment {
  name: string;
  type: string;
  size?: number;
  dataUrl?: string;
  fileBase64?: string;
  attachmentType?: AttachmentCategory;
}

export interface ChatMessage {
  id: string;
  consultationId?: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  safetyEvaluation?: SafetyEvaluation;
  attachment?: ChatAttachment;
  attachments?: ChatAttachment[];
  reportAnalysis?: ReportAnalysisResult;
  visualAnalysisSummary?: string;
}

export interface CaseSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string;
  persona?: UserPersona;
  model?: string;
  elevenlabsConversationId?: string;
  metadata?: Record<string, unknown>;
}

export interface CaseWithMessages extends CaseSummary {
  messages: ChatMessage[];
}

export interface ChatAttachmentPayload {
  fileBase64: string;
  mimeType: string;
  fileName: string;
  fileSize?: number;
  dataUrl?: string;
  attachmentType?: AttachmentCategory;
}

export interface ChatRequest {
  message: string;
  model: AIModelId;
  caseId?: string;
  attachment?: ChatAttachmentPayload;
  attachments?: ChatAttachmentPayload[];
  attachmentType?: AttachmentCategory;
  persona?: UserPersona;
  history?: Array<{
    role: "user" | "assistant";
    content: string;
    attachment?: ChatAttachment;
    attachments?: ChatAttachment[];
  }>;
}

export interface ChatResponse {
  reply: string;
  caseId: string;
  messages?: {
    user: ChatMessage;
    assistant: ChatMessage;
  };
  model: AIModelId;
  safetyEvaluation?: SafetyEvaluation;
  reportAnalysis?: ReportAnalysisResult;
  visualAnalysisSummary?: string;
  assessmentStatus?: "INCOMPLETE" | "SUFFICIENT_FOR_PROVISIONAL_ASSESSMENT" | "URGENT_ACTION_REQUIRED" | "COMPLETE" | string;
  urgencyLevel?: string;
}

// Lab / Medical Report Types
export type LabResultStatus = "LOW" | "HIGH" | "NORMAL" | "CRITICAL" | "ATTENTION" | "UNKNOWN";

export interface LabResultItem {
  test_name: string;
  value: string;
  unit: string;
  reference_range: string;
  status: LabResultStatus;
  explanation: string;
  requires_medical_review: boolean;
}

export interface ReportMetrics {
  uploadMs?: number;
  extractionMs?: number;
  ttftMs?: number;
  totalMs?: number;
  cached?: boolean;
}

export interface ReportAnalysisResult {
  report_type: string;
  patient_name_or_id?: string;
  report_date?: string;
  lab_name?: string;
  results?: LabResultItem[];
  tests: LabResultItem[];
  overall_summary: string;
  key_findings: string[];
  missing_information?: string;
  potential_red_flags?: string[];
  red_flags?: string[];
  questions_for_doctor: string[];
  disclaimer?: string;
  metrics?: ReportMetrics;
}

// Safety Engine Types
export type RiskLevel = "NORMAL" | "NEEDS_REVIEW" | "POTENTIAL_EMERGENCY";

export interface SafetyEvaluation {
  level: RiskLevel;
  reasons: string[];
  actionRequired: string;
  emergencyWarning?: string;
}

// Structured Patient Summary for Aegis -> Oracle Handoff
export interface PatientHandoffSummary {
  chiefComplaint: string;
  symptoms: string[];
  duration: string;
  relevantHistory: string;
  medications: string;
  allergies: string;
  reportFindings: string[];
  potentialRedFlags: string[];
  questionsForDoctor: string[];
  generatedAt: string;
}
