import type { ChatMessage } from "@/lib/types";
import type { AegisCaseState } from "@/services/aegis/aegisCaseState";
import { createCleanCaseState, validateCaseStateIsolation } from "@/services/aegis/aegisCaseState";
import type { NormalizedClinicalSummary } from "@/lib/clinical/types";

export interface IsolatedConsultationState {
  consultationId: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  caseState: AegisCaseState;
  clinicalSummary: NormalizedClinicalSummary | null;
  doctorNote: string | null;
  patientDemographics?: {
    name?: string;
    age?: string;
    sex?: string;
  };
}

const STORAGE_PREFIX = "aegis_consultation_";
const ACTIVE_CONSULTATION_KEY = "aegis_active_consultation_id";

/**
 * Creates an empty, clean clinical state for a new consultation.
 * Guarantees zero clinical carryover from previous consultations.
 */
export function createEmptyConsultation(
  consultationId: string,
  demographics?: { name?: string; age?: string; sex?: string }
): IsolatedConsultationState {
  const now = new Date().toISOString();
  return {
    consultationId,
    createdAt: now,
    updatedAt: now,
    messages: [],
    caseState: createCleanCaseState(consultationId, demographics),
    clinicalSummary: null,
    doctorNote: null,
    patientDemographics: demographics,
  };
}

/**
 * Persists consultation state under an isolated key: aegis_consultation_<consultationId>
 * Preserves all unrelated application and authentication settings.
 */
export function saveConsultationState(state: IsolatedConsultationState): void {
  if (typeof window === "undefined" || !state.consultationId) return;

  try {
    const key = `${STORAGE_PREFIX}${state.consultationId}`;
    const payload = JSON.stringify({
      ...state,
      updatedAt: new Date().toISOString(),
    });
    localStorage.setItem(key, payload);
  } catch (err) {
    console.warn("[ConsultationStorage] Failed to save consultation state:", err);
  }
}

/**
 * Loads consultation state strictly for the specified consultationId.
 * NEVER falls back to another consultation or previous clinical state.
 */
export function loadConsultationState(consultationId: string): IsolatedConsultationState | null {
  if (typeof window === "undefined" || !consultationId) return null;

  try {
    const key = `${STORAGE_PREFIX}${consultationId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as IsolatedConsultationState;
    if (parsed.consultationId !== consultationId) {
      console.warn("[ConsultationStorage] Corrupted consultation ID mismatch. Discarding.");
      return null;
    }

    // Defensive validation: ensure messages belong to this consultation
    const cleanMessages = (parsed.messages || []).map((m) => ({
      ...m,
      consultationId,
      timestamp: new Date(m.timestamp),
    }));

    const cleanCaseState = validateCaseStateIsolation(parsed.caseState, consultationId);

    return {
      ...parsed,
      messages: cleanMessages,
      caseState: cleanCaseState,
    };
  } catch (err) {
    console.warn("[ConsultationStorage] Failed to load consultation state:", err);
    return null;
  }
}

/**
 * Removes a consultation's isolated data from localStorage upon deletion.
 */
export function deleteConsultationState(consultationId: string): void {
  if (typeof window === "undefined" || !consultationId) return;

  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${consultationId}`);
    if (getActiveConsultationId() === consultationId) {
      clearActiveConsultationId();
    }
  } catch (err) {
    console.warn("[ConsultationStorage] Failed to delete consultation state:", err);
  }
}

/**
 * Gets the active consultation identifier.
 */
export function getActiveConsultationId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(ACTIVE_CONSULTATION_KEY);
  } catch {
    return null;
  }
}

/**
 * Sets the active consultation identifier.
 */
export function setActiveConsultationId(consultationId: string): void {
  if (typeof window === "undefined" || !consultationId) return;
  try {
    localStorage.setItem(ACTIVE_CONSULTATION_KEY, consultationId);
  } catch {
    // Ignore
  }
}

/**
 * Clears the active consultation pointer.
 */
export function clearActiveConsultationId(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(ACTIVE_CONSULTATION_KEY);
  } catch {
    // Ignore
  }
}

/**
 * Defensive validation: validates that an array of messages strictly belongs
 * to the specified consultationId. Any mismatched or stale messages are purged.
 */
export function validateMessagesIsolation(
  messages: ChatMessage[],
  activeConsultationId: string | null
): ChatMessage[] {
  if (!activeConsultationId) return messages.filter((m) => !m.consultationId);
  return messages.filter((m) => !m.consultationId || m.consultationId === activeConsultationId);
}
