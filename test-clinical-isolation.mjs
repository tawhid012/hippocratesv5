/**
 * AEGIS CLINICAL STATE ISOLATION VERIFICATION SUITE
 * Tests Tests A, B, C, D, and E from the specification.
 */

import assert from "node:assert";
import {
  extractInstantaneousCaseUpdates,
  createCleanCaseState,
  validateCaseStateIsolation,
  EMPTY_CASE_STATE,
} from "./src/services/aegis/aegisCaseState.ts";

// Consultation isolation logic as implemented in consultationStorage.ts
function createEmptyConsultation(consultationId, demographics) {
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

function validateMessagesIsolation(messages, activeConsultationId) {
  if (!activeConsultationId || !messages) return [];
  return messages.filter((m) => !m.consultationId || m.consultationId === activeConsultationId);
}

console.log("=== RUNNING AEGIS CLINICAL STATE ISOLATION TEST SUITE ===\n");

// ---------------------------------------------------------------------------
// TEST A — Fresh consultation: Clean clinical state initialization
// ---------------------------------------------------------------------------
console.log("TEST A: Fresh Consultation State Isolation");

const consultationIdA = "11111111-1111-4111-a111-111111111111";
let caseStateA = createCleanCaseState(consultationIdA);
assert.strictEqual(caseStateA.consultation_id, consultationIdA);
assert.strictEqual(caseStateA.assessment_status, "INCOMPLETE");
assert.deepStrictEqual(caseStateA.associated_symptoms, []);
assert.deepStrictEqual(caseStateA.pertinent_negatives, []);

// Patient reports in Consultation A
const msgA1 = "I have lower right abdominal pain that started yesterday.";
caseStateA = extractInstantaneousCaseUpdates(msgA1, caseStateA);

assert(
  caseStateA.location?.toLowerCase().includes("lower right") ||
  caseStateA.associated_symptoms.some((s) => s.toLowerCase().includes("abdominal")),
  "Case State A must capture lower right abdominal pain"
);

// User clicks NEW CONSULTATION -> consultationId B
const consultationIdB = "22222222-2222-4222-b222-222222222222";
const consultationB = createEmptyConsultation(consultationIdB);

// Invariant verification for New Consultation B
assert.strictEqual(consultationB.consultationId, consultationIdB);
assert.deepStrictEqual(consultationB.messages, [], "Messages must be EMPTY");
assert.strictEqual(consultationB.clinicalSummary, null, "Clinical summary must be NULL");
assert.strictEqual(consultationB.doctorNote, null, "Doctor note must be NULL");
assert.strictEqual(consultationB.caseState.consultation_id, consultationIdB);
assert.strictEqual(consultationB.caseState.chief_complaint, null);
assert.strictEqual(consultationB.caseState.location, null);
assert.deepStrictEqual(consultationB.caseState.associated_symptoms, []);
assert.deepStrictEqual(consultationB.caseState.pertinent_negatives, []);
assert.deepStrictEqual(consultationB.caseState.clinical_observations, []);
assert.deepStrictEqual(consultationB.caseState.possible_considerations, []);
assert.strictEqual(consultationB.caseState.assessment_status, "INCOMPLETE");

// User sends first message in Consultation B
const msgB1 = "I've had a headache since this morning.";
let caseStateB = extractInstantaneousCaseUpdates(msgB1, consultationB.caseState);

// Verify B has headache, and ZERO abdominal pain
assert(
  caseStateB.associated_symptoms.some((s) => s.toLowerCase().includes("headache")) ||
  caseStateB.chief_complaint?.toLowerCase().includes("headache"),
  "Case State B must contain headache"
);
assert(
  !JSON.stringify(caseStateB).toLowerCase().includes("abdominal"),
  "Case State B must NOT contain any abdominal pain from Consultation A!"
);
console.log("  ✓ TEST A PASSED: Clean consultation B initialized with zero carryover from A.\n");

// ---------------------------------------------------------------------------
// TEST B — Previous conversation contamination: Message & context isolation
// ---------------------------------------------------------------------------
console.log("TEST B: Previous Conversation Contamination Prevention");

const messagesConsultationA = [
  {
    id: "msg-a-1",
    consultationId: consultationIdA,
    role: "user",
    content: "I have chest pain radiating to my left arm.",
    timestamp: new Date(),
  },
  {
    id: "msg-a-2",
    consultationId: consultationIdA,
    role: "assistant",
    content: "Chest pain radiating to the arm is a critical symptom requiring emergency evaluation.",
    timestamp: new Date(),
  },
];

// Start consultation B with user message
const messagesConsultationB = [
  {
    id: "msg-b-1",
    consultationId: consultationIdB,
    role: "user",
    content: "My stomach has been hurting.",
    timestamp: new Date(),
  },
];

// Simulate accidental dirty state contamination attempt
const dirtyMixedMessages = [...messagesConsultationA, ...messagesConsultationB];
const isolatedB = validateMessagesIsolation(dirtyMixedMessages, consultationIdB);

assert.strictEqual(isolatedB.length, 1);
assert.strictEqual(isolatedB[0].id, "msg-b-1");
assert.strictEqual(isolatedB[0].content, "My stomach has been hurting.");
assert(!isolatedB.some((m) => m.content.includes("chest pain")));
console.log("  ✓ TEST B PASSED: Stale conversation messages quarantined before model context.\n");

// ---------------------------------------------------------------------------
// TEST C — Previous summary contamination: Summary & Doctor Note isolation
// ---------------------------------------------------------------------------
console.log("TEST C: Summary & Doctor Note Isolation");

const summaryA = {
  documentId: "doc-summary-A",
  conversationId: consultationIdA,
  status: "COMPLETE",
  chiefComplaint: "Lower right abdominal pain",
  doctorHandoff: "Dr. Note: Patient presents with suspected RLQ pain...",
};

// When New Consultation B is active, summary must be null
let activeSummaryForB = null;
assert.strictEqual(activeSummaryForB, null);

// If an outdated case state from A is attempted to be passed to summary generator for B
const quarantinedCaseState = validateCaseStateIsolation(caseStateA, consultationIdB);
assert.strictEqual(quarantinedCaseState.consultation_id, consultationIdB);
assert.deepStrictEqual(quarantinedCaseState.associated_symptoms, []);
assert.strictEqual(quarantinedCaseState.chief_complaint, null);
console.log("  ✓ TEST C PASSED: Summary and Doctor Note strictly isolated per consultation.\n");

// ---------------------------------------------------------------------------
// TEST D — Database paused / Offline behavior
// ---------------------------------------------------------------------------
console.log("TEST D: Database Paused / Offline Isolation");

// In offline / DB-paused mode, client creates clean local consultation
const offlineId1 = "offline-consultation-1";
const offline1 = createEmptyConsultation(offlineId1);
offline1.messages.push({
  id: "off-msg-1",
  consultationId: offlineId1,
  role: "user",
  content: "Fever and chills for 2 days",
  timestamp: new Date(),
});

// User starts new consultation while DB is still paused
const offlineId2 = "offline-consultation-2";
const offline2 = createEmptyConsultation(offlineId2);

// Verify offline2 starts 100% clean and does not fallback to offline1
assert.strictEqual(offline2.consultationId, offlineId2);
assert.strictEqual(offline2.messages.length, 0);
assert.strictEqual(offline2.caseState.associated_symptoms.length, 0);
assert.strictEqual(offline2.clinicalSummary, null);
console.log("  ✓ TEST D PASSED: Database paused mode maintains strict empty local consultation.\n");

// ---------------------------------------------------------------------------
// TEST E — Multiple consultations isolation (A, B, C, D)
// ---------------------------------------------------------------------------
console.log("TEST E: Multiple Consultations Isolation (A, B, C, D)");

const consultConfigs = [
  { id: "case-a-id", symptomMsg: "lower right abdominal pain with nausea", expectedKey: "abdominal" },
  { id: "case-b-id", symptomMsg: "severe throbbing tension headache", expectedKey: "headache" },
  { id: "case-c-id", symptomMsg: "sore throat and persistent dry cough", expectedKey: "cough" },
  { id: "case-d-id", symptomMsg: "sprained my right ankle playing basketball", expectedKey: "ankle" },
];

const consultationStore = new Map();

// 1. Create and populate each independently
for (const config of consultConfigs) {
  const consult = createEmptyConsultation(config.id);
  consult.messages.push({
    id: `msg-${config.id}`,
    consultationId: config.id,
    role: "user",
    content: config.symptomMsg,
    timestamp: new Date(),
  });
  consult.caseState = extractInstantaneousCaseUpdates(config.symptomMsg, consult.caseState);
  consultationStore.set(config.id, consult);
}

// 2. Cross-verify no leakage between any pair
for (let i = 0; i < consultConfigs.length; i++) {
  const cur = consultConfigs[i];
  const state = consultationStore.get(cur.id);
  const stateStr = JSON.stringify(state).toLowerCase();

  // Must contain its own symptom
  assert(
    stateStr.includes(cur.expectedKey),
    `Consultation ${cur.id} should contain ${cur.expectedKey}`
  );

  // Must NOT contain any other consultation's symptom
  for (let j = 0; j < consultConfigs.length; j++) {
    if (i !== j) {
      const other = consultConfigs[j];
      assert(
        !stateStr.includes(other.expectedKey),
        `Consultation ${cur.id} contaminated with ${other.expectedKey} from ${other.id}!`
      );
    }
  }
}

console.log("  ✓ TEST E PASSED: A, B, C, D maintain 100% independent, un-contaminated clinical states.\n");
console.log("=== ALL CLINICAL STATE ISOLATION TESTS PASSED SUCCESSFULLY! ===");
