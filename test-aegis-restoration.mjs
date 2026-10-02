/**
 * AEGIS MASTER RESTORATION VALIDATION SUITE
 * Validates TEST 1, 2, 3, 4 from Section 34 of the specification.
 */

import assert from "node:assert";
import {
  extractInstantaneousCaseUpdates,
  createCleanCaseState,
  buildCaseStateContext,
  stripInternalCaseState,
  EMPTY_CASE_STATE,
} from "./src/services/aegis/aegisCaseState.ts";

console.log("=== RUNNING AEGIS MASTER RESTORATION VALIDATION SUITE ===\n");

// ---------------------------------------------------------------------------
// TEST 1 & 2: Progressive Headache State Tracking & No-Repeat Guards
// ---------------------------------------------------------------------------
console.log("--- TEST 1 & 2: Headache Progression & Zero-Hallucination ---");

const testId = "test-consultation-headache";
let caseState = createCleanCaseState(testId);

// Turn 1: Simple headache
const t1Msg = "I've been getting headaches for the past few days, and they're starting to bother me more.";
caseState = extractInstantaneousCaseUpdates(t1Msg, caseState);

assert.strictEqual(caseState.chief_complaint, "Headache");
assert(
  caseState.duration?.toLowerCase().includes("past few days") ||
  caseState.established_topics.includes("duration"),
  "Must capture duration (past few days)"
);
assert.strictEqual(caseState.assessment_status, "INCOMPLETE");
console.log("  ✓ Turn 1: Captured headache and duration, status INCOMPLETE");

// Turn 2: Gradual onset
const t2Msg = "It built up gradually over the past few days.";
caseState = extractInstantaneousCaseUpdates(t2Msg, caseState);

assert(
  caseState.onset?.toLowerCase().includes("gradual") ||
  caseState.established_topics.includes("onset"),
  "Must capture gradual onset"
);
console.log("  ✓ Turn 2: Captured gradual onset without losing duration");

// Turn 3: Bilateral frontal forehead + constant pressure rather than sharp or throbbing
const t3Msg = "It's mostly on both sides of my forehead, and it feels like a constant pressure rather than a sharp or throbbing pain.";
caseState = extractInstantaneousCaseUpdates(t3Msg, caseState);

assert(
  caseState.location?.toLowerCase().includes("forehead") ||
  caseState.location?.toLowerCase().includes("frontal"),
  "Location must be bilateral frontal / forehead"
);
assert.strictEqual(caseState.quality, "Constant pressure", "Quality must be 'Constant pressure'");

// CRITICAL NEGATION CHECK: sharp & throbbing must NOT be positive quality!
assert.notStrictEqual(caseState.quality, "Sharp", "Quality must NOT be sharp!");
assert.notStrictEqual(caseState.quality, "Throbbing", "Quality must NOT be throbbing!");

const deniedSharp = caseState.pertinent_negatives.some((n) => n.toLowerCase().includes("sharp"));
const deniedThrobbing = caseState.pertinent_negatives.some((n) => n.toLowerCase().includes("throbbing"));
assert(deniedSharp, "Sharp pain must be recorded as pertinent negative (denied)");
assert(deniedThrobbing, "Throbbing pain must be recorded as pertinent negative (denied)");

// Verify established topics include location, onset, duration, quality
assert(caseState.established_topics.includes("pain location"));
assert(caseState.established_topics.includes("onset"));
assert(caseState.established_topics.includes("duration"));
assert(caseState.established_topics.includes("pain quality"));

// Context test: Ensure buildCaseStateContext contains established topics
const contextStr = buildCaseStateContext(caseState);
assert(contextStr.includes("Established Topics (DO NOT RE-ASK)"));
assert(contextStr.includes("pain location"));
assert(contextStr.includes("onset"));
assert(contextStr.includes("pain quality"));
assert(!contextStr.includes("### Current Clinical Case State Update"), "Must not contain user-facing markdown headers");

console.log("  ✓ Turn 3: Correctly established frontal location, constant pressure, pertinent negatives (no sharp/throbbing), and established topics guard.\n");

// ---------------------------------------------------------------------------
// TEST 3: Unknown vs Absent Semantics
// ---------------------------------------------------------------------------
console.log("--- TEST 3: Unknown vs Absent Semantics ---");

let state3 = createCleanCaseState("test-unknown-vs-absent");
const t3PatientMsg = "I haven't noticed any stuffy or runny nose.";
state3 = extractInstantaneousCaseUpdates(t3PatientMsg, state3);

// Stuffy/runny nose must be explicitly ABSENT (pertinent negative)
const nasalDenied = state3.pertinent_negatives.some((n) =>
  n.toLowerCase().includes("stuffy") || n.toLowerCase().includes("runny")
);
assert(nasalDenied, "Stuffy/runny nose must be recorded as ABSENT (denied)");

// Light sensitivity was NEVER mentioned -> must NOT be in pertinent negatives or associated symptoms!
const lightInNegatives = state3.pertinent_negatives.some((n) => n.toLowerCase().includes("light"));
const lightInPositives = state3.associated_symptoms.some((n) => n.toLowerCase().includes("light"));
assert(!lightInNegatives, "Light sensitivity must NOT be inferred as absent when unmentioned!");
assert(!lightInPositives, "Light sensitivity must NOT be inferred as present when unmentioned!");

// Objective temperature must be UNMEASURED / UNKNOWN, not negative
const tempInNegatives = state3.pertinent_negatives.some((n) => n.toLowerCase().includes("objective temperature"));
assert(!tempInNegatives, "Objective temperature must not be marked negative!");

console.log("  ✓ TEST 3 PASSED: nasal symptoms = ABSENT, unmentioned light sensitivity = UNKNOWN (never converted).\n");

// ---------------------------------------------------------------------------
// TEST 4: Abdominal Pain / Appendicitis Pattern & Stopping Rule
// ---------------------------------------------------------------------------
console.log("--- TEST 4: Abdominal Pain / Appendicitis Pattern & Stopping Gate ---");

let state4 = createCleanCaseState("test-appendicitis-case");

// Turn 1: Stomach pain since yesterday
state4 = extractInstantaneousCaseUpdates("I've been having stomach pain since yesterday.", state4);
assert.strictEqual(state4.assessment_status, "INCOMPLETE");
assert(state4.location?.toLowerCase().includes("abdomen"));
assert.strictEqual(state4.onset, "Yesterday");

// Turn 2: Dull pain lower right side 6/10 continuous
state4 = extractInstantaneousCaseUpdates(
  "It's a dull pain around the lower right side of my abdomen. It's been there continuously since yesterday and I'd rate it around 6 out of 10.",
  state4
);
assert(state4.location?.toLowerCase().includes("lower right"));
assert.strictEqual(state4.quality, "Dull");
assert.strictEqual(state4.severity, "6/10");
assert(state4.timing?.toLowerCase().includes("continuous"));

// Turn 3: Slightly nauseous, haven't vomited, don't think fever, bowel movements normal
state4 = extractInstantaneousCaseUpdates(
  "I feel slightly nauseous, but I haven't vomited. I don't think I have a fever. My bowel movements are normal.",
  state4
);
assert(state4.associated_symptoms.some((s) => s.toLowerCase().includes("nausea")));
assert(state4.pertinent_negatives.some((n) => n.toLowerCase().includes("vomit")));
assert(state4.pertinent_negatives.some((n) => n.toLowerCase().includes("fever")));
assert(state4.pertinent_negatives.some((n) => n.toLowerCase().includes("bowel")));

// Turn 4: No medical conditions, no regular medicines, pain worse when walking
state4 = extractInstantaneousCaseUpdates(
  "No, I don't have any medical conditions and I don't take any regular medicines. The pain seems a little worse when I walk around.",
  state4
);
assert(state4.provoking_factors.some((f) => f.toLowerCase().includes("walk")));
assert(state4.medical_history.some((h) => h.toLowerCase().includes("no known")));
assert(state4.medications.some((m) => m.toLowerCase().includes("no regular")));

// Pattern recognition & stopping gate verification:
assert.strictEqual(
  state4.assessment_status,
  "SUFFICIENT_FOR_PROVISIONAL_ASSESSMENT",
  "Assessment status must be SUFFICIENT_FOR_PROVISIONAL_ASSESSMENT"
);
assert.strictEqual(state4.urgency_level, "URGENT", "Urgency level must be URGENT");
assert(
  state4.possible_considerations.some((c) => c.toLowerCase().includes("appendicitis")),
  "Clinical considerations must include appendicitis"
);

// Directive check
const context4 = buildCaseStateContext(state4);
assert(
  context4.includes("Directive: Assessment is now sufficient. DO NOT ask another routine question."),
  "Context must instruct model to stop routine questioning and synthesize findings"
);

// Check that no self-exam maneuvers are present
assert(!context4.toLowerCase().includes("rebound tenderness test"));
assert(!context4.toLowerCase().includes("press deeply"));

console.log("  ✓ TEST 4 PASSED: Appendicitis pattern recognized, status SUFFICIENT_FOR_PROVISIONAL_ASSESSMENT, urgency URGENT, no self-exam maneuvers.\n");

// ---------------------------------------------------------------------------
// TEST 5: Internal Case State Cleaner
// ---------------------------------------------------------------------------
console.log("--- TEST 5: stripInternalCaseState Output Hygiene ---");

const dirtyText = `### Current Clinical Case State Update
- Known / Present: Lower right abdominal pain, nausea
- Known / Absent: Vomiting, fever
- Unknown / Unmeasured: Objective temperature
- Urgency Level: URGENT
- Assessment Status Gate: SUFFICIENT_FOR_PROVISIONAL_ASSESSMENT

Got it — the pain has been present since yesterday and is mainly on the lower right side. Have you noticed any changes in your bowel movements?`;

const cleaned = stripInternalCaseState(dirtyText);
assert(!cleaned.includes("Current Clinical Case State Update"));
assert(!cleaned.includes("Known / Present"));
assert(!cleaned.includes("Assessment Status Gate"));
assert(cleaned.includes("Got it — the pain has been present since yesterday"));
assert(cleaned.includes("Have you noticed any changes in your bowel movements?"));

console.log("  ✓ TEST 5 PASSED: stripInternalCaseState cleanly removes any accidental debug headers.\n");

console.log("=== ALL RESTORATION TESTS PASSED PERFECTLY! ===");
