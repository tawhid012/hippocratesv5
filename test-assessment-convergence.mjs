import assert from "node:assert";
import {
  createCleanCaseState,
  extractInstantaneousCaseUpdates,
  determineAssessmentStatusFromResponse,
  validateCaseStateIsolation,
} from "./src/services/aegis/aegisCaseState.ts";
import { evaluateSafety } from "./src/lib/aegis/safety.ts";

console.log("=== RUNNING AEGIS ASSESSMENT CONVERGENCE & COMPLETION MASTER SUITE ===");

// -------------------------------------------------------------
// TEST A — Incomplete case
// -------------------------------------------------------------
console.log("\n--- TEST A: Incomplete Case ---");
{
  const state0 = createCleanCaseState("test-a");
  const state1 = extractInstantaneousCaseUpdates("I haven't been feeling well lately.", state0);
  assert.strictEqual(
    state1.assessment_status,
    "INCOMPLETE",
    "Vague symptom must remain INCOMPLETE"
  );
  console.log("  ✓ TEST A PASSED: Vague presentation remains INCOMPLETE.");
}

// -------------------------------------------------------------
// TEST B — Sufficient provisional assessment
// -------------------------------------------------------------
console.log("\n--- TEST B: Sufficient Provisional Assessment ---");
{
  let state = createCleanCaseState("test-b");
  state = extractInstantaneousCaseUpdates("I have a dull pain around the lower right side of my abdomen since yesterday rated 6 out of 10.", state);
  state = extractInstantaneousCaseUpdates("I feel slightly nauseous, but I haven't vomited. No fever. Normal bowels.", state);
  assert.strictEqual(
    state.assessment_status,
    "SUFFICIENT_FOR_PROVISIONAL_ASSESSMENT",
    "Should reach SUFFICIENT_FOR_PROVISIONAL_ASSESSMENT"
  );
  console.log("  ✓ TEST B PASSED: Coherent pattern reaches SUFFICIENT_FOR_PROVISIONAL_ASSESSMENT without definitive diagnosis.");
}

// -------------------------------------------------------------
// TEST C — Unknown non-critical field
// -------------------------------------------------------------
console.log("\n--- TEST C: Unknown Non-Critical Field ---");
{
  let state = createCleanCaseState("test-c");
  // Patient reports headache details; diet and bowel habits are UNKNOWN
  state = extractInstantaneousCaseUpdates("I've had a dull pressing headache on both sides of my forehead for the past 3 days.", state);
  state = extractInstantaneousCaseUpdates("No fever, no vision changes, no weakness. It feels like constant pressure.", state);
  
  // Non-critical fields are completely unknown
  assert.strictEqual(state.bowel_habits, undefined);
  assert.strictEqual(state.diet, undefined);
  // Yet assessment should be sufficient
  assert.strictEqual(
    state.assessment_status,
    "SUFFICIENT_FOR_PROVISIONAL_ASSESSMENT",
    "Non-critical unknowns must not prevent assessment sufficiency"
  );
  console.log("  ✓ TEST C PASSED: Irrelevant unknowns do not block SUFFICIENT_FOR_PROVISIONAL_ASSESSMENT.");
}

// -------------------------------------------------------------
// TEST D — Unknown critical red flag
// -------------------------------------------------------------
console.log("\n--- TEST D: Unknown Critical Red Flag ---");
{
  const state = createCleanCaseState("test-d");
  const updated = extractInstantaneousCaseUpdates("I feel dizzy when I stand up.", state);
  // Red flag (chest pain, syncope) is UNKNOWN
  assert.strictEqual(updated.urgency_level, "UNKNOWN");
  assert.strictEqual(updated.assessment_status, "INCOMPLETE");
  
  const safety = evaluateSafety("I feel dizzy when I stand up.");
  assert.strictEqual(safety.level, "NORMAL", "Unknown red flag must not trigger emergency alert");
  console.log("  ✓ TEST D PASSED: Unknown critical red flag keeps status INCOMPLETE without false emergency.");
}

// -------------------------------------------------------------
// TEST E — Red flag question alone
// -------------------------------------------------------------
console.log("\n--- TEST E: Red Flag Question Alone ---");
{
  const question1 = "Are you experiencing any chest pain or shortness of breath?";
  const safety1 = evaluateSafety(question1);
  assert.strictEqual(safety1.level, "NORMAL", "Safety check on question alone must be NORMAL");
  assert.strictEqual(safety1.reasons.length, 0);

  const question2 = "Have you ever fainted or lost consciousness?";
  const safety2 = evaluateSafety(question2);
  assert.strictEqual(safety2.level, "NORMAL", "Safety check on syncope question must be NORMAL");
  console.log("  ✓ TEST E PASSED: Red flag question alone never triggers emergency alert.");
}

// -------------------------------------------------------------
// TEST F — Confirmed emergency
// -------------------------------------------------------------
console.log("\n--- TEST F: Confirmed Emergency ---");
{
  const msg = "I have severe crushing chest pressure radiating to my left arm and jaw and I can't breathe.";
  const safety = evaluateSafety(msg);
  assert.strictEqual(safety.level, "POTENTIAL_EMERGENCY");

  const state = createCleanCaseState("test-f");
  const updated = extractInstantaneousCaseUpdates(msg, state);
  assert.strictEqual(updated.urgency_level, "EMERGENCY");
  assert.strictEqual(updated.assessment_status, "URGENT_ACTION_REQUIRED");
  console.log("  ✓ TEST F PASSED: Confirmed emergency triggers immediate emergency pathway.");
}

// -------------------------------------------------------------
// TEST G — Explicit negative emergency findings
// -------------------------------------------------------------
console.log("\n--- TEST G: Explicit Negative Emergency Findings ---");
{
  const msg = "No, I haven't had any chest pain or shortness of breath, and I have never fainted.";
  const safety = evaluateSafety(msg);
  assert.strictEqual(safety.level, "NORMAL", "Explicit denials must NOT trigger emergency alert");
  assert.strictEqual(safety.reasons.length, 0);

  const state = createCleanCaseState("test-g");
  const updated = extractInstantaneousCaseUpdates(msg, state);
  assert.notStrictEqual(updated.urgency_level, "EMERGENCY");
  assert.notStrictEqual(updated.assessment_status, "URGENT_ACTION_REQUIRED");
  assert.ok(updated.pertinent_negatives.some(n => n.includes("Chest pain: denied") || n.includes("Chest pain / pressure: denied")));
  assert.ok(updated.pertinent_negatives.some(n => n.includes("Shortness of breath")));
  assert.ok(updated.pertinent_negatives.some(n => n.includes("Syncope")));
  console.log("  ✓ TEST G PASSED: Explicit denials close emergency pathway with zero false alerts.");
}

// -------------------------------------------------------------
// TEST H — Long-form fatigue / orthostatic case
// -------------------------------------------------------------
console.log("\n--- TEST H: Long-Form Fatigue & Orthostatic Case ---");
{
  let state = createCleanCaseState("test-h");
  state = extractInstantaneousCaseUpdates("I've been dealing with persistent fatigue for the past couple of weeks.", state);
  state = extractInstantaneousCaseUpdates("I sleep about 7 to 8 hours fine, and my mood is fine with no low mood.", state);
  state = extractInstantaneousCaseUpdates("When I stand up, I get lightheaded and my heart starts racing, but it settles within 1-2 minutes.", state);
  state = extractInstantaneousCaseUpdates("I drink plenty of water, have a normal appetite, no recent illness, no medications, and no chest pain, no shortness of breath, and haven't fainted.", state);

  assert.strictEqual(state.assessment_status, "SUFFICIENT_FOR_PROVISIONAL_ASSESSMENT");
  assert.strictEqual(state.urgency_level, "ROUTINE");
  assert.ok(state.possible_considerations.some(c => c.toLowerCase().includes("orthostatic") || c.toLowerCase().includes("pots")));
  assert.ok(state.possible_considerations.some(c => c.toLowerCase().includes("iron") || c.toLowerCase().includes("thyroid")));

  // Test response convergence evaluation
  const aegisResponse = `The most distinctive part of your symptoms is that the lightheadedness and racing heartbeat occur repeatedly after standing and settle within a couple of minutes. That pattern makes an orthostatic process worth evaluating. The persistent fatigue also means other contributors, such as iron deficiency or thyroid problems, remain possible. These possibilities cannot be distinguished reliably from symptoms alone. I recommend scheduling an evaluation with your primary care provider for orthostatic vital signs and baseline blood work.`;

  const finalStatus = determineAssessmentStatusFromResponse(aegisResponse, state.assessment_status);
  assert.strictEqual(
    finalStatus,
    "SUFFICIENT_FOR_PROVISIONAL_ASSESSMENT",
    "Aegis provisional synthesis must be SUFFICIENT_FOR_PROVISIONAL_ASSESSMENT or COMPLETE"
  );
  console.log("  ✓ TEST H PASSED: Fatigue/orthostatic case converges cleanly, connects case, and transitions out of IN_PROGRESS.");
}

// -------------------------------------------------------------
// TEST I — Summary separation
// -------------------------------------------------------------
console.log("\n--- TEST I: Summary Separation ---");
{
  let state = createCleanCaseState("test-i");
  state = extractInstantaneousCaseUpdates("I have lower right quadrant pain since yesterday rated 6/10 with mild nausea and no fever.", state);
  // Assessment is sufficient BEFORE any summary is generated
  assert.strictEqual(state.assessment_status, "SUFFICIENT_FOR_PROVISIONAL_ASSESSMENT");
  console.log("  ✓ TEST I PASSED: Assessment completion operates independently of summary generation.");
}

// -------------------------------------------------------------
// TEST J — New consultation isolation
// -------------------------------------------------------------
console.log("\n--- TEST J: New Consultation Isolation ---");
{
  const stateA = createCleanCaseState("consultation-A");
  const populatedA = extractInstantaneousCaseUpdates("Severe lower right abdominal pain rated 8/10", stateA);
  
  const stateB = createCleanCaseState("consultation-B");
  assert.strictEqual(stateB.chief_complaint, null);
  assert.strictEqual(stateB.location, null);
  assert.strictEqual(stateB.consultation_id, "consultation-B");
  
  const validated = validateCaseStateIsolation(populatedA, "consultation-B");
  assert.strictEqual(validated.chief_complaint, null, "Cross-consultation state must be cleanly wiped");
  console.log("  ✓ TEST J PASSED: Zero cross-consultation state carryover.");
}

console.log("\n=== ALL SECTION 29 REGRESSION TESTS PASSED PERFECTLY! ===");
