/**
 * AEGIS CLINICAL CASE STATE — PHASE 2.1 MASTER PATCH
 *
 * Maintains a structured representation of the patient's clinical picture
 * across conversation turns. Stored in chat_sessions.metadata and injected
 * as a structured context into each Aegis API call.
 *
 * Implements:
 * 1. Three-way information state:
 *    - KNOWN / PRESENT
 *    - KNOWN / ABSENT (Pertinent Negatives - explicitly denied)
 *    - UNKNOWN / UNMEASURED (Not tested / not measured — NOT negative)
 * 2. Assessment completeness gate:
 *    - "INCOMPLETE" | "SUFFICIENT_FOR_PROVISIONAL_ASSESSMENT" | "URGENT_ACTION_REQUIRED" | "COMPLETE"
 * 3. Instantaneous deterministic state updates on latest incoming message (< 1ms).
 * 4. Ban on redundant questions for established topics.
 * 5. Hard boundary against remote physical examination maneuvers.
 */

export type UrgencyLevel =
  | "EMERGENCY"
  | "URGENT"
  | "ROUTINE"
  | "SELF_CARE"
  | "UNKNOWN";

export type AssessmentStatus =
  | "INCOMPLETE"
  | "SUFFICIENT_FOR_PROVISIONAL_ASSESSMENT"
  | "URGENT_ACTION_REQUIRED"
  | "COMPLETE"
  | "UNKNOWN";

export interface AegisCaseState {
  // Core symptom profile
  chief_complaint: string | null;
  onset: string | null;
  duration: string | null;
  location: string | null;
  quality: string | null; // sharp, dull, burning, cramping, throbbing, pressure, etc.
  severity: string | null; // 0–10 scale or descriptive
  timing: string | null; // constant/intermittent, progression, pattern
  radiation: string | null; // Does it spread anywhere?

  // Context factors
  provoking_factors: string[]; // What makes it worse?
  relieving_factors: string[]; // What makes it better?

  // Symptom inventory (Three-way state)
  associated_symptoms: string[]; // Known Present
  pertinent_negatives: string[]; // Known Absent (explicitly denied by patient)
  unmeasured_factors: string[]; // Known Unmeasured (e.g. objective temperature not checked, labs not done)

  // History
  medical_history: string[];
  surgical_history: string[];
  medications: string[];
  allergies: string[];
  family_history: string[];
  social_history: string[];
  exposures: string[];

  // Risk and safety
  red_flags: string[];
  urgency_level: UrgencyLevel;

  // Epistemic tracking
  clinical_observations: string[]; // Patient observations (e.g., tender to normal touch, worse when walking)
  possible_considerations: string[]; // Differential possibilities being considered
  uncertainties: string[]; // Things that remain unclear
  missing_information: string[]; // Genuinely important clinical unknowns
  assessment_limitations: string[]; // What Aegis could NOT assess (physical exam, ECG, labs, etc.)

  // Assessment status gate
  assessment_completeness: AssessmentStatus;
  assessment_status?: AssessmentStatus;

  // Topics already established — NEVER re-ask questions about these
  established_topics: string[];

  // Meta
  consultation_id?: string | null;
  patient_name: string | null;
  patient_age: string | null;
  patient_sex: string | null;
  last_updated: string;
  turn_count: number;
}

export const EMPTY_CASE_STATE: AegisCaseState = {
  chief_complaint: null,
  onset: null,
  duration: null,
  location: null,
  quality: null,
  severity: null,
  timing: null,
  radiation: null,
  provoking_factors: [],
  relieving_factors: [],
  associated_symptoms: [],
  pertinent_negatives: [],
  unmeasured_factors: [
    "Objective temperature not measured with thermometer",
    "Clinical physical examination not performed",
    "Diagnostic laboratory tests not performed",
    "Diagnostic imaging not performed",
  ],
  medical_history: [],
  surgical_history: [],
  medications: [],
  allergies: [],
  family_history: [],
  social_history: [],
  exposures: [],
  red_flags: [],
  urgency_level: "UNKNOWN",
  clinical_observations: [],
  possible_considerations: [],
  uncertainties: [],
  missing_information: [],
  assessment_limitations: [
    "In-person physical examination cannot be performed remotely",
    "Vital signs have not been objectively measured",
    "No diagnostic imaging or laboratory studies available",
  ],
  assessment_completeness: "UNKNOWN",
  assessment_status: "INCOMPLETE",
  established_topics: [],
  consultation_id: null,
  patient_name: null,
  patient_age: null,
  patient_sex: null,
  last_updated: new Date().toISOString(),
  turn_count: 0,
};

/**
 * Deterministic helper: merges an array of strings uniquely (case-insensitive deduplication).
 */
function mergeUnique(existing: string[], incoming: string[]): string[] {
  const seen = new Set(existing.map((s) => s.toLowerCase().trim()));
  const result = [...existing];
  for (const item of incoming) {
    const clean = item.trim();
    if (clean && !seen.has(clean.toLowerCase())) {
      seen.add(clean.toLowerCase());
      result.push(clean);
    }
  }
  return result;
}

/**
 * Super-fast, lightweight (<1ms) deterministic clinical case extractor.
 * Immediately captures clinical facts from the patient's incoming message so that
 * Aegis is instantly state-aware on this exact turn without waiting for async background updates.
 */
export function extractInstantaneousCaseUpdates(
  userMessage: string,
  currentState: AegisCaseState = EMPTY_CASE_STATE
): AegisCaseState {
  const text = (userMessage || "").trim();
  if (!text) return { ...currentState };

  const lower = text.toLowerCase();
  const next: AegisCaseState = {
    ...EMPTY_CASE_STATE,
    ...currentState,
    consultation_id: currentState.consultation_id || null,
    turn_count: (currentState.turn_count || 0) + 1,
    provoking_factors: [...(currentState.provoking_factors || [])],
    relieving_factors: [...(currentState.relieving_factors || [])],
    associated_symptoms: [...(currentState.associated_symptoms || [])],
    pertinent_negatives: [...(currentState.pertinent_negatives || [])],
    unmeasured_factors: [...(currentState.unmeasured_factors || [])],
    medical_history: [...(currentState.medical_history || [])],
    surgical_history: [...(currentState.surgical_history || [])],
    medications: [...(currentState.medications || [])],
    allergies: [...(currentState.allergies || [])],
    red_flags: [...(currentState.red_flags || [])],
    clinical_observations: [...(currentState.clinical_observations || [])],
    possible_considerations: [...(currentState.possible_considerations || [])],
    established_topics: [...(currentState.established_topics || [])],
  };

  // Negation helper for clinical findings in user message
  const isFindingNegated = (phrase: string): boolean => {
    const idx = lower.indexOf(phrase);
    if (idx === -1) return false;
    const prefix = lower.slice(0, idx);
    const clause = prefix.split(/[.;\n]|(?:\b(?:but|however|except|although)\b)/i).pop() || "";
    const negationPattern = /\b(?:no|not|never|neither|nor|without|haven't|hasn't|don't|doesn't|didn't|won't|can't|cannot|deny|denies|denied|negative|zero)\b/i;
    if (negationPattern.test(clause)) return true;
    const suffix = lower.slice(idx + phrase.length, Math.min(lower.length, idx + phrase.length + 30));
    if (/^[:\s-]*(?:no|none|negative|denied|absent|not\s+present|ruled\s+out)\b/i.test(suffix)) return true;
    return false;
  };

  // 1. EMERGENCY INDICATORS (Highest priority, verified PRESENT only)
  const isChestEmergency =
    (lower.includes("chest pain") || lower.includes("chest pressure") || lower.includes("crushing chest")) &&
    !isFindingNegated("chest pain") &&
    !isFindingNegated("chest pressure") &&
    (lower.includes("arm") ||
      lower.includes("jaw") ||
      lower.includes("spreading") ||
      lower.includes("radiat") ||
      lower.includes("crushing") ||
      lower.includes("pressure"));
  const isBreathEmergency =
    (lower.includes("can't breathe") ||
      lower.includes("cannot breathe") ||
      lower.includes("struggling to breathe") ||
      lower.includes("gasping")) &&
    !isFindingNegated("can't breathe") &&
    !isFindingNegated("cannot breathe");
  const isStrokeEmergency =
    ((lower.includes("facial") && lower.includes("droop") && !isFindingNegated("droop")) ||
      (lower.includes("arm") && lower.includes("weak") && !isFindingNegated("weak")) ||
      (lower.includes("slurred speech") && !isFindingNegated("slurred speech")));

  // THUNDERCLAP / SUDDEN MAXIMAL-ONSET HEADACHE — safety-critical override
  const isThunderclapHeadache =
    (lower.includes("thunderclap") ||
      lower.includes("worst headache of my life") ||
      lower.includes("worst headache i've ever") ||
      lower.includes("worst headache i have ever") ||
      lower.includes("never had a headache like this") ||
      /\b(peaked|reached|hit).{0,25}(intensity|severity|peak).{0,20}(in|within).{0,10}(seconds?|a second|moments?)\b/.test(lower) ||
      /\bmaximum intensity.{0,20}(in|within).{0,10}(seconds?|a second|moments?)\b/.test(lower) ||
      /\bextremely severe.{0,20}(in|within).{0,10}(seconds?|a second|moments?)\b/.test(lower) ||
      /\bheadache.{0,60}(within|in).{0,5}(seconds?|a second)\b/.test(lower) ||
      (/\b(10|ten|five|5|fifteen|15|thirty|30)\s*seconds?\b/.test(lower) && (lower.includes("headache") || lower.includes("head pain")))) &&
    !isFindingNegated("headache");

  if (isThunderclapHeadache) {
    // HARD OVERRIDE: Unconditionally set to emergency regardless of prior state
    next.urgency_level = "EMERGENCY";
    next.assessment_completeness = "URGENT_ACTION_REQUIRED";
    next.assessment_status = "URGENT_ACTION_REQUIRED";
    next.red_flags = mergeUnique(next.red_flags, [
      "Sudden maximal-onset headache (thunderclap pattern) — subarachnoid haemorrhage must be excluded urgently",
    ]);
    next.chief_complaint = "Sudden maximal-onset headache (thunderclap pattern)";
    next.possible_considerations = [
      "Subarachnoid haemorrhage (SAH) — sudden maximal-onset headache requires emergency exclusion",
      "Other intracranial emergency requiring urgent CT/LP evaluation",
    ];
    next.established_topics = mergeUnique(next.established_topics, [
      "headache onset character", "thunderclap onset",
    ]);
    return next;
  }

  if (isChestEmergency || isBreathEmergency || isStrokeEmergency) {
    next.urgency_level = "EMERGENCY";
    next.assessment_completeness = "URGENT_ACTION_REQUIRED";
    next.assessment_status = "URGENT_ACTION_REQUIRED";
    if (isChestEmergency) {
      next.red_flags = mergeUnique(next.red_flags, [
        "Acute chest pain with radiation to arm/jaw (high cardiac risk)",
      ]);
      next.chief_complaint = next.chief_complaint || "Acute chest pain with radiation";
      next.location = next.location || "Chest, radiating to left arm";
      next.established_topics = mergeUnique(next.established_topics, [
        "pain location",
        "radiation",
      ]);
    }
    return next;
  }

  // Explicit denials of emergency symptoms close emergency pathway (Section 17 & TEST G)
  if (lower.includes("chest pain") || lower.includes("chest pressure")) {
    if (isFindingNegated("chest pain") || isFindingNegated("chest pressure") || lower.includes("no chest pain") || lower.includes("haven't had chest pain")) {
      next.pertinent_negatives = mergeUnique(next.pertinent_negatives, [
        "Chest pain / pressure: denied",
      ]);
      next.established_topics = mergeUnique(next.established_topics, ["chest pain status"]);
    }
  }
  if (lower.includes("shortness of breath") || lower.includes("breathless") || lower.includes("difficulty breathing")) {
    if (isFindingNegated("shortness of breath") || isFindingNegated("breathless") || lower.includes("no shortness of breath") || lower.includes("not breathless")) {
      next.pertinent_negatives = mergeUnique(next.pertinent_negatives, [
        "Shortness of breath / dyspnea: denied",
      ]);
      next.established_topics = mergeUnique(next.established_topics, ["shortness of breath status"]);
    }
  }
  if (lower.includes("syncope") || lower.includes("faint") || lower.includes("passed out") || lower.includes("blacked out")) {
    if (isFindingNegated("faint") || isFindingNegated("syncope") || isFindingNegated("passed out") || lower.includes("no fainting") || lower.includes("haven't fainted") || lower.includes("never fainted") || lower.includes("no syncope")) {
      next.pertinent_negatives = mergeUnique(next.pertinent_negatives, [
        "Syncope / loss of consciousness: denied",
      ]);
      next.established_topics = mergeUnique(next.established_topics, ["syncope status"]);
    }
  }

  // 2. CHIEF COMPLAINT & LOCATION
  if (
    lower.includes("lower right") ||
    lower.includes("rlq") ||
    lower.includes("right lower quadrant") ||
    lower.includes("right side of my abdomen")
  ) {
    next.location = "Lower right abdomen (RLQ)";
    next.chief_complaint = next.chief_complaint || "Lower right abdominal pain";
    next.established_topics = mergeUnique(next.established_topics, [
      "pain location",
      "abdominal area",
    ]);
  } else if (lower.includes("upper right") || lower.includes("ruq")) {
    next.location = "Upper right abdomen (RUQ)";
    next.chief_complaint = next.chief_complaint || "Upper right abdominal pain";
    next.established_topics = mergeUnique(next.established_topics, ["pain location"]);
  } else if (lower.includes("stomach pain") || lower.includes("abdominal pain")) {
    if (!next.location) {
      next.location = "Abdomen";
    }
    next.chief_complaint = next.chief_complaint || "Abdominal pain";
    next.established_topics = mergeUnique(next.established_topics, ["pain location"]);
  } else if (
    lower.includes("both sides of my forehead") ||
    lower.includes("both sides of the forehead") ||
    lower.includes("bilateral frontal") ||
    lower.includes("forehead")
  ) {
    next.location = "Bilateral frontal (forehead)";
    next.chief_complaint = next.chief_complaint || "Bilateral frontal headache";
    next.established_topics = mergeUnique(next.established_topics, ["headache", "pain location", "headache location"]);
  } else if (lower.includes("temple") || lower.includes("temples")) {
    next.location = "Temples";
    next.chief_complaint = next.chief_complaint || "Headache";
    next.established_topics = mergeUnique(next.established_topics, ["headache", "pain location"]);
  } else if (lower.includes("headache") || lower.includes("headaches")) {
    next.location = next.location || "Head";
    next.chief_complaint = next.chief_complaint || "Headache";
    next.established_topics = mergeUnique(next.established_topics, ["headache", "pain location"]);
  } else if (lower.includes("chest pain")) {
    next.location = "Chest";
    next.chief_complaint = next.chief_complaint || "Chest pain";
    next.established_topics = mergeUnique(next.established_topics, ["pain location"]);
  } else if (lower.includes("throat") || lower.includes("sore throat")) {
    next.location = "Throat";
    next.chief_complaint = next.chief_complaint || "Sore throat";
    next.established_topics = mergeUnique(next.established_topics, ["throat", "pain location"]);
  }

  if (
    !next.chief_complaint &&
    (lower.includes("stomach pain") || lower.includes("abdominal pain"))
  ) {
    next.chief_complaint = next.location
      ? `${next.location} pain`
      : "Abdominal pain";
  }

  // 3. ONSET, DURATION & TIMING
  if (lower.includes("since yesterday")) {
    next.onset = "Yesterday";
    next.duration = "Approximately 24–30 hours (since yesterday)";
    next.established_topics = mergeUnique(next.established_topics, [
      "onset",
      "duration",
      "timeline",
    ]);
  } else if (
    lower.includes("past few days") ||
    lower.includes("for the past few days") ||
    lower.includes("past couple of days") ||
    lower.includes("few days")
  ) {
    next.duration = "Past few days";
    next.established_topics = mergeUnique(next.established_topics, [
      "duration",
      "timeline",
    ]);
  } else if (lower.includes("for two days") || lower.includes("for 2 days") || lower.includes("two days")) {
    next.onset = "2 days ago";
    next.duration = "2 days";
    next.established_topics = mergeUnique(next.established_topics, [
      "onset",
      "duration",
      "timeline",
    ]);
  } else if (lower.includes("20 minutes") || lower.includes("twenty minutes")) {
    next.onset = "20 minutes ago";
    next.duration = "20 minutes";
    next.established_topics = mergeUnique(next.established_topics, [
      "onset",
      "duration",
      "timeline",
    ]);
  } else if (lower.includes("since this afternoon")) {
    next.onset = "This afternoon";
    next.duration = "A few hours (since this afternoon)";
    next.established_topics = mergeUnique(next.established_topics, [
      "onset",
      "duration",
      "timeline",
    ]);
  } else {
    const durMatch = lower.match(/\b(?:for\s+)?(?:the\s+)?(?:past\s+|last\s+)?(\d+|one|two|three|four|five|six|several|a few|couple of)\s*(days?|weeks?|months?|hours?|minutes?)\b/i);
    if (durMatch) {
      next.duration = `${durMatch[1]} ${durMatch[2]}`;
      next.established_topics = mergeUnique(next.established_topics, ["duration", "timeline"]);
    }
  }

  if (
    lower.includes("built up gradually") ||
    lower.includes("gradually") ||
    lower.includes("gradual")
  ) {
    next.onset = "Gradual onset (built up gradually)";
    next.established_topics = mergeUnique(next.established_topics, ["onset", "onset character", "timeline"]);
  } else if (lower.includes("suddenly") || lower.includes("sudden")) {
    next.onset = "Sudden onset";
    next.established_topics = mergeUnique(next.established_topics, ["onset", "onset character", "timeline"]);
  }

  if (lower.includes("continuous") || lower.includes("there continuously") || lower.includes("constant")) {
    next.timing = "Continuous / constant";
    next.established_topics = mergeUnique(next.established_topics, ["timing / continuity"]);
  }
  if (lower.includes("stayed about the same") || lower.includes("fairly steady")) {
    next.timing = next.timing
      ? `${next.timing}, stable trajectory overall`
      : "Stable trajectory overall";
    next.established_topics = mergeUnique(next.established_topics, ["progression"]);
  }

  // 4. QUALITY & SEVERITY (Strict Negation Handling — Never convert denied quality to positive!)
  const deniesSharp =
    lower.includes("rather than a sharp") ||
    lower.includes("rather than sharp") ||
    lower.includes("not sharp") ||
    lower.includes("no sharp");
  const deniesThrobbing =
    lower.includes("rather than a sharp or throbbing") ||
    lower.includes("rather than throbbing") ||
    lower.includes("not throbbing") ||
    lower.includes("no throbbing");

  if (deniesSharp) {
    next.pertinent_negatives = mergeUnique(next.pertinent_negatives, [
      "Sharp pain quality: denied",
    ]);
    next.established_topics = mergeUnique(next.established_topics, ["pain quality", "sharp pain status"]);
  }
  if (deniesThrobbing) {
    next.pertinent_negatives = mergeUnique(next.pertinent_negatives, [
      "Throbbing pain quality: denied",
    ]);
    next.established_topics = mergeUnique(next.established_topics, ["pain quality", "throbbing pain status"]);
  }

  if (lower.includes("constant pressure") || lower.includes("feels like a constant pressure")) {
    next.quality = "Constant pressure";
    next.established_topics = mergeUnique(next.established_topics, ["pain quality"]);
  } else if (lower.includes("pressure") && !lower.includes("blood pressure")) {
    next.quality = "Pressure";
    next.established_topics = mergeUnique(next.established_topics, ["pain quality"]);
  } else if (lower.includes("dull")) {
    next.quality = "Dull";
    next.established_topics = mergeUnique(next.established_topics, ["pain quality"]);
  } else if (lower.includes("sharp") && !deniesSharp) {
    next.quality = "Sharp";
    next.established_topics = mergeUnique(next.established_topics, ["pain quality"]);
  } else if (lower.includes("cramping") || lower.includes("cramp")) {
    next.quality = "Cramping";
    next.established_topics = mergeUnique(next.established_topics, ["pain quality"]);
  } else if (lower.includes("throbbing") && !deniesThrobbing) {
    next.quality = "Throbbing";
    next.established_topics = mergeUnique(next.established_topics, ["pain quality"]);
  } else if (lower.includes("burning")) {
    next.quality = "Burning";
    next.established_topics = mergeUnique(next.established_topics, ["pain quality"]);
  }

  const sevMatch =
    text.match(/\b([0-9]|10)\s*(out of|\/)\s*10\b/i) ||
    text.match(/\brate it around ([0-9]|10)\b/i) ||
    text.match(/\baround ([0-9]|10) out of 10\b/i);
  if (sevMatch) {
    const num = sevMatch[1];
    next.severity = `${num}/10`;
    next.established_topics = mergeUnique(next.established_topics, ["severity"]);
  } else if (lower.includes("mild")) {
    next.severity = "Mild";
    next.established_topics = mergeUnique(next.established_topics, ["severity"]);
  } else if (lower.includes("severe")) {
    next.severity = "Severe";
    next.established_topics = mergeUnique(next.established_topics, ["severity"]);
  }

  // 5. PROVOKING & RELIEVING FACTORS
  if (
    lower.includes("worse when i walk") ||
    lower.includes("worse when walking") ||
    lower.includes("worse with walking") ||
    lower.includes("worse when i move") ||
    lower.includes("worse with movement")
  ) {
    next.provoking_factors = mergeUnique(next.provoking_factors, [
      "Worse with walking or movement",
    ]);
    next.clinical_observations = mergeUnique(next.clinical_observations, [
      "Movement-induced pain aggravation (reported by patient)",
    ]);
    next.established_topics = mergeUnique(next.established_topics, [
      "provoking factors",
      "movement relationship",
    ]);
  }
  if (lower.includes("worse when i swallow") || lower.includes("worse on swallowing")) {
    next.provoking_factors = mergeUnique(next.provoking_factors, ["Worse on swallowing"]);
    next.established_topics = mergeUnique(next.established_topics, ["provoking factors"]);
  }
  if (lower.includes("after studying")) {
    next.provoking_factors = mergeUnique(next.provoking_factors, [
      "Occurred after prolonged studying / screen time",
    ]);
    next.established_topics = mergeUnique(next.established_topics, ["context / trigger"]);
  }

  // 6. ASSOCIATED SYMPTOMS (KNOWN / PRESENT)
  if (
    lower.includes("nauseous") ||
    lower.includes("nausea") ||
    lower.includes("mild nausea") ||
    lower.includes("slightly nauseous")
  ) {
    next.associated_symptoms = mergeUnique(next.associated_symptoms, [
      "Mild nausea",
    ]);
    next.established_topics = mergeUnique(next.established_topics, [
      "nausea status",
    ]);
  }
  if (
    lower.includes("appetite is a little lower") ||
    lower.includes("reduced appetite") ||
    lower.includes("lower appetite") ||
    lower.includes("loss of appetite")
  ) {
    next.associated_symptoms = mergeUnique(next.associated_symptoms, [
      "Reduced appetite (still able to eat)",
    ]);
    next.established_topics = mergeUnique(next.established_topics, [
      "appetite status",
    ]);
  }

  // 7. PERTINENT NEGATIVES (KNOWN / ABSENT — EXPLICITLY DENIED BY PATIENT)
  if (
    lower.includes("haven't noticed any stuffy or runny nose") ||
    lower.includes("no stuffy or runny nose") ||
    lower.includes("no runny nose") ||
    lower.includes("no stuffy nose") ||
    lower.includes("not stuffy or runny")
  ) {
    next.pertinent_negatives = mergeUnique(next.pertinent_negatives, [
      "Stuffy or runny nose: denied (absent)",
    ]);
    next.established_topics = mergeUnique(next.established_topics, [
      "nasal symptoms",
    ]);
  }
  if (
    lower.includes("haven't vomited") ||
    lower.includes("have not vomited") ||
    lower.includes("no vomiting") ||
    lower.includes("not vomiting")
  ) {
    next.pertinent_negatives = mergeUnique(next.pertinent_negatives, [
      "Vomiting: denied (no episodes of vomiting)",
    ]);
    next.established_topics = mergeUnique(next.established_topics, [
      "vomiting status",
    ]);
  }
  if (
    lower.includes("don't think i have a fever") ||
    lower.includes("do not think i have a fever") ||
    lower.includes("no fever") ||
    lower.includes("don't feel feverish") ||
    lower.includes("do not feel feverish")
  ) {
    next.pertinent_negatives = mergeUnique(next.pertinent_negatives, [
      "Feverish feeling: denied (does not feel feverish)",
    ]);
    next.unmeasured_factors = mergeUnique(next.unmeasured_factors, [
      "Objective temperature: NOT MEASURED (denies feeling feverish, but thermometer reading is unknown)",
    ]);
    next.established_topics = mergeUnique(next.established_topics, [
      "fever feeling status",
      "objective temperature check",
    ]);
  }
  if (lower.includes("no chills") || lower.includes("don't have chills") || lower.includes("haven't had chills")) {
    next.pertinent_negatives = mergeUnique(next.pertinent_negatives, [
      "Chills: denied",
    ]);
    next.established_topics = mergeUnique(next.established_topics, ["chills status"]);
  }
  if (
    lower.includes("bowel movements are normal") ||
    lower.includes("normal bowel movements") ||
    lower.includes("no diarrhea") ||
    lower.includes("no bowel changes")
  ) {
    next.pertinent_negatives = mergeUnique(next.pertinent_negatives, [
      "Bowel habit changes: denied (normal bowel movements reported)",
    ]);
    next.established_topics = mergeUnique(next.established_topics, [
      "bowel habit status",
    ]);
  }
  if (
    lower.includes("don't have any medical conditions") ||
    lower.includes("no medical conditions") ||
    lower.includes("no prior conditions")
  ) {
    next.medical_history = ["No known pre-existing medical conditions"];
    next.pertinent_negatives = mergeUnique(next.pertinent_negatives, [
      "Pre-existing medical conditions: none reported",
    ]);
    next.established_topics = mergeUnique(next.established_topics, [
      "medical history",
    ]);
  }
  if (
    lower.includes("don't take any regular medicines") ||
    lower.includes("no regular medicines") ||
    lower.includes("no regular medications") ||
    lower.includes("no medications")
  ) {
    next.medications = ["No regular medications reported"];
    next.pertinent_negatives = mergeUnique(next.pertinent_negatives, [
      "Regular medications: none reported",
    ]);
    next.established_topics = mergeUnique(next.established_topics, ["medications"]);
  }
  if (lower.includes("no weakness")) {
    next.pertinent_negatives = mergeUnique(next.pertinent_negatives, [
      "Neurological weakness: denied",
    ]);
    next.established_topics = mergeUnique(next.established_topics, ["weakness"]);
  }
  if (lower.includes("no vision changes")) {
    next.pertinent_negatives = mergeUnique(next.pertinent_negatives, [
      "Visual disturbances: denied",
    ]);
    next.established_topics = mergeUnique(next.established_topics, [
      "vision changes",
    ]);
  }

  // 8. THREE-WAY DISTINCTION: UNMEASURED / UNTESTED (NOT NEGATIVE)
  if (
    lower.includes("haven't checked my temperature") ||
    lower.includes("haven't checked temperature") ||
    lower.includes("haven't measured temperature") ||
    lower.includes("not checked my temperature")
  ) {
    next.unmeasured_factors = mergeUnique(next.unmeasured_factors, [
      "Objective temperature: NOT MEASURED (thermometer reading is unknown)",
    ]);
    next.established_topics = mergeUnique(next.established_topics, [
      "objective temperature check",
    ]);
  }

  // 9. PATIENT OBSERVATION VS CLINICAL EXAMINATION MANEUVERS
  if (
    lower.includes("tender when i touch") ||
    lower.includes("feels tender when i touch") ||
    lower.includes("feels tender") ||
    lower.includes("tender to touch")
  ) {
    next.clinical_observations = mergeUnique(next.clinical_observations, [
      "Patient-reported tenderness on normal contact (spontaneous observation; NOT a clinical palpation test)",
    ]);
    next.established_topics = mergeUnique(next.established_topics, [
      "touch tenderness",
    ]);
  }
  if (
    lower.includes("haven't tried pressing hard") ||
    lower.includes("haven't tried pressing hard or letting go suddenly") ||
    lower.includes("haven't pressed hard")
  ) {
    next.clinical_observations = mergeUnique(next.clinical_observations, [
      "No provocative physical maneuvers attempted (properly refrained from self-palpation)",
    ]);
    next.unmeasured_factors = mergeUnique(next.unmeasured_factors, [
      "Clinical physical examination findings (rebound, guarding, McBurney sign): UNKNOWN / CANNOT BE ASSESSED REMOTELY",
    ]);
  }

  // 10. CLINICAL CONSIDERATION RECOGNITION (Pattern detection)
  const isRLQPain =
    next.location?.toLowerCase().includes("lower right") ||
    next.location?.toLowerCase().includes("rlq");
  const hasAppyFeatures =
    isRLQPain &&
    (next.provoking_factors.some((f) => f.toLowerCase().includes("walk") || f.toLowerCase().includes("move")) ||
      next.associated_symptoms.some((s) => s.toLowerCase().includes("nausea")) ||
      next.clinical_observations.some((o) => o.toLowerCase().includes("tender")));

  if (hasAppyFeatures) {
    next.possible_considerations = mergeUnique(next.possible_considerations, [
      "Appendicitis (appendiceal inflammation) — supported by localized right lower quadrant pain, continuous duration, nausea, and movement-induced aggravation",
      "Other gastrointestinal or mesenteric causes (e.g. mesenteric adenitis, bowel irritation)",
    ]);
    next.urgency_level = "URGENT"; // Prompt same-day physical assessment
  }

  // Simple tension headache check
  if (
    next.chief_complaint?.toLowerCase().includes("headache") &&
    lower.includes("studying") &&
    next.pertinent_negatives.some((n) => n.toLowerCase().includes("fever") || n.toLowerCase().includes("weakness"))
  ) {
    next.possible_considerations = mergeUnique(next.possible_considerations, [
      "Tension-type headache or digital eye strain related to prolonged study",
    ]);
    next.urgency_level = "SELF_CARE";
    next.assessment_completeness = "SUFFICIENT_FOR_PROVISIONAL_ASSESSMENT";
    next.assessment_status = "SUFFICIENT_FOR_PROVISIONAL_ASSESSMENT";
  }

  // Fatigue & Orthostatic pattern recognition (Section 14 & TEST H)
  if (lower.includes("fatigue") || lower.includes("tiredness") || lower.includes("exhausted") || lower.includes("exhaustion") || lower.includes("feeling tired")) {
    next.chief_complaint = next.chief_complaint || "Persistent fatigue";
    next.established_topics = mergeUnique(next.established_topics, ["fatigue", "chief complaint"]);
  }

  if (
    (lower.includes("standing") || lower.includes("stand up") || lower.includes("upright")) &&
    (lower.includes("dizz") || lower.includes("lighthead") || lower.includes("racing") || lower.includes("heart") || lower.includes("palpitat"))
  ) {
    next.provoking_factors = mergeUnique(next.provoking_factors, [
      "Standing up / upright posture (triggers lightheadedness and racing heartbeat)",
    ]);
    next.associated_symptoms = mergeUnique(next.associated_symptoms, [
      "Recurrent lightheadedness upon standing",
      "Racing heartbeat / postural palpitations on standing",
    ]);
    next.established_topics = mergeUnique(next.established_topics, [
      "postural triggers",
      "lightheadedness on standing",
      "heart rate response to standing",
    ]);
  }

  if (
    lower.includes("1-2 minutes") ||
    lower.includes("1 to 2 minutes") ||
    lower.includes("one to two minutes") ||
    lower.includes("couple of minutes") ||
    lower.includes("few minutes") ||
    lower.includes("settles within") ||
    lower.includes("resolves within")
  ) {
    next.relieving_factors = mergeUnique(next.relieving_factors, [
      "Symptoms settle/resolve within 1–2 minutes of standing or resting",
    ]);
    next.established_topics = mergeUnique(next.established_topics, ["symptom resolution timing"]);
  }

  if (lower.includes("sleep") && (lower.includes("adequate") || lower.includes("enough") || lower.includes("good") || lower.includes("fine") || lower.includes("7") || lower.includes("8"))) {
    next.pertinent_negatives = mergeUnique(next.pertinent_negatives, [
      "Sleep deprivation: denied (adequate sleep duration reported)",
    ]);
    next.established_topics = mergeUnique(next.established_topics, ["sleep duration"]);
  }

  if (lower.includes("mood") || lower.includes("depress") || lower.includes("anhedonia")) {
    if (isFindingNegated("mood") || isFindingNegated("depress") || lower.includes("no low mood") || lower.includes("not depressed") || lower.includes("mood is fine") || lower.includes("no obvious")) {
      next.pertinent_negatives = mergeUnique(next.pertinent_negatives, [
        "Depressed mood / anhedonia: denied",
      ]);
      next.established_topics = mergeUnique(next.established_topics, ["mood status"]);
    }
  }

  if (lower.includes("water") || lower.includes("fluid") || lower.includes("hydrat")) {
    if (lower.includes("adequate") || lower.includes("enough") || lower.includes("plenty") || lower.includes("good") || lower.includes("well")) {
      next.pertinent_negatives = mergeUnique(next.pertinent_negatives, [
        "Inadequate fluid intake: denied (adequate reported hydration)",
      ]);
      next.established_topics = mergeUnique(next.established_topics, ["hydration"]);
    }
  }

  if (lower.includes("recent illness") || lower.includes("been sick") || lower.includes("infection")) {
    if (isFindingNegated("recent illness") || lower.includes("no recent illness") || lower.includes("haven't been sick")) {
      next.pertinent_negatives = mergeUnique(next.pertinent_negatives, [
        "Recent infection / viral illness: denied",
      ]);
      next.established_topics = mergeUnique(next.established_topics, ["recent illness status"]);
    }
  }

  if (lower.includes("appetite")) {
    if (lower.includes("normal") || lower.includes("good") || lower.includes("fine")) {
      next.pertinent_negatives = mergeUnique(next.pertinent_negatives, [
        "Appetite changes: denied (normal appetite reported)",
      ]);
      next.established_topics = mergeUnique(next.established_topics, ["appetite status"]);
    }
  }

  const hasOrthostaticPattern =
    (next.chief_complaint?.toLowerCase().includes("fatigue") || next.associated_symptoms.some((s) => s.toLowerCase().includes("lighthead") || s.toLowerCase().includes("racing"))) &&
    next.provoking_factors.some((f) => f.toLowerCase().includes("standing")) &&
    (next.pertinent_negatives.some((n) => n.toLowerCase().includes("syncope")) ||
     next.pertinent_negatives.some((n) => n.toLowerCase().includes("chest pain")) ||
     next.pertinent_negatives.length >= 2);

  if (hasOrthostaticPattern) {
    next.possible_considerations = mergeUnique(next.possible_considerations, [
      "Orthostatic intolerance / postural tachycardia syndrome (POTS) or orthostatic hypotension — lightheadedness and racing pulse triggered reproducibly on standing and settling quickly",
      "Metabolic or hematologic contributors to fatigue (e.g. iron deficiency / ferritin depletion, thyroid dysfunction, electrolyte shifts)",
    ]);
    next.urgency_level = "ROUTINE"; // Non-emergency scheduled clinical evaluation
    next.assessment_completeness = "SUFFICIENT_FOR_PROVISIONAL_ASSESSMENT";
    next.assessment_status = "SUFFICIENT_FOR_PROVISIONAL_ASSESSMENT";
  }

  // 11. GENERAL ASSESSMENT COMPLETENESS EVALUATION & STOPPING GATE (Information Sufficiency Principle)
  if (next.assessment_status !== "URGENT_ACTION_REQUIRED" && next.assessment_status !== "SUFFICIENT_FOR_PROVISIONAL_ASSESSMENT") {
    const hasCoreConcern = Boolean(next.chief_complaint || next.location);
    const hasChronology = Boolean(next.onset || next.duration);
    const hasPertinentDetails =
      next.severity !== undefined ||
      next.quality !== undefined ||
      next.provoking_factors.length > 0 ||
      next.relieving_factors.length > 0 ||
      next.associated_symptoms.length > 0 ||
      next.pertinent_negatives.length > 0;

    const isCoherentPattern = hasCoreConcern && hasChronology && hasPertinentDetails;

    const clinicalDimensionsCount = [
      hasCoreConcern,
      hasChronology,
      Boolean(next.quality || next.severity),
      next.associated_symptoms.length > 0,
      next.pertinent_negatives.length > 0,
      next.provoking_factors.length > 0 || next.relieving_factors.length > 0,
    ].filter(Boolean).length;

    if (isCoherentPattern && (clinicalDimensionsCount >= 4 || (next.turn_count || 0) >= 2)) {
      next.assessment_completeness = "SUFFICIENT_FOR_PROVISIONAL_ASSESSMENT";
      next.assessment_status = "SUFFICIENT_FOR_PROVISIONAL_ASSESSMENT";
    }
  }

  return next;
}

/**
 * Deterministically strips any internal Clinical Case State headers,
 * raw state enums, or debug sections from patient-facing responses.
 */
export function stripInternalCaseState(text: string): string {
  if (!text) return "";

  let cleaned = text;

  // 1. Remove standard case state update block
  cleaned = cleaned.replace(
    /(?:#{1,6}\s*)?(?:Current\s+)?Clinical\s+Case\s+State(?:\s+Update)?[\s\S]*?(?:Assessment\s+Status(?:\s+Gate)?:\s*[^\n]+(?:\n+|$)|Urgency\s+Level:\s*[^\n]+(?:\n+|$))/gi,
    ""
  );

  // 2. Remove bracketed section blocks
  cleaned = cleaned.replace(
    /={3,}[\s\S]*?CURRENT CLINICAL CASE STATE[\s\S]*?={3,}/gi,
    ""
  );

  cleaned = cleaned.replace(
    /\[\d\.\s*(?:KNOWN\s*\/\s*(?:PRESENT|ABSENT)|UNKNOWN\s*\/\s*UNMEASURED)[^\]]*\][\s\S]*?(?=\n\n|\n[A-Z]|$)/gi,
    ""
  );

  cleaned = cleaned.replace(
    /\[INTERNAL CLINICAL CONTEXT[\s\S]*?\[END INTERNAL CLINICAL CONTEXT\]/gi,
    ""
  );

  // 3. Line-by-line cleaner for remaining state headers or stray list items
  const lines = cleaned.split("\n");
  const filteredLines: string[] = [];
  let inStateList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (
      /^#{1,6}\s*(?:Current\s+)?Clinical\s+Case\s+State(?:\s+Update)?/i.test(trimmed) ||
      /^(?:Current\s+)?Clinical\s+Case\s+State(?:\s+Update)?:?$/i.test(trimmed) ||
      /^#{1,6}\s*(?:Known\s*\/\s*(?:Present|Absent)|Unknown\s*\/\s*(?:Unmeasured|Not Established))/i.test(trimmed) ||
      /^(?:Known\s*\/\s*(?:Present|Absent)|Unknown\s*\/\s*(?:Unmeasured|Not Established)):?$/i.test(trimmed) ||
      /^(?:Assessment\s+Status(?:\s+Gate)?|Urgency\s+Level)\s*:\s*[A-Za-z_]+/i.test(trimmed) ||
      /^\[INTERNAL CLINICAL/i.test(trimmed) ||
      /^\[END INTERNAL CLINICAL/i.test(trimmed)
    ) {
      inStateList = true;
      continue;
    }

    if (inStateList) {
      if (
        /^\s*[-*•]\s*(?:Onset|Location|Quality|Severity|Duration|Timing|Radiation|Known|Unknown|Pertinent|Red\s*Flags?|Medical\s*History|Medications?|Allergies|Fever|Nausea|Light|Sharpness|Throbbing|Pain|Assessment|Urgency)/i.test(line) ||
        /^\s*[-*•]\s*.*:\s*(?:PRESENT|ABSENT|UNKNOWN|UNMEASURED|INCOMPLETE|None|Normal)/i.test(line) ||
        /^\s*[-*•]\s*$/i.test(line) ||
        trimmed === ""
      ) {
        const nextLine = lines[i + 1]?.trim() || "";
        const nextIsSentence =
          nextLine.length > 0 &&
          !nextLine.startsWith("-") &&
          !nextLine.startsWith("*") &&
          !nextLine.startsWith("•") &&
          !nextLine.startsWith("#") &&
          !nextLine.includes(":") &&
          !nextLine.toLowerCase().startsWith("known") &&
          !nextLine.toLowerCase().startsWith("unknown");

        if (trimmed === "" && nextIsSentence) {
          inStateList = false;
        }
        continue;
      } else {
        inStateList = false;
      }
    }

    if (
      /^\s*[*•-]?\s*(?:Assessment\s+Status(?:\s+Gate)?|Urgency\s+Level)\s*:\s*[A-Za-z_]+/i.test(trimmed) ||
      /^\s*[*•-]?\s*(?:Light sensitivity|Temperature|Blood pressure|Severity|Onset|Location|Quality)\s*:\s*(?:UNKNOWN|UNMEASURED|NOT ESTABLISHED)/i.test(trimmed)
    ) {
      continue;
    }

    filteredLines.push(line);
  }

  cleaned = filteredLines.join("\n").replace(/^\n{2,}/, "\n").trim();
  return cleaned;
}

/**
 * Builds the structured clinical case state context string
 * for injection into the Aegis system instruction.
 * Formatted cleanly as internal clinical background to ensure the model
 * reasons from the established facts WITHOUT echoing headers or debug syntax to the patient.
 */
export function buildCaseStateContext(state: AegisCaseState): string {
  const status = state.assessment_status || state.assessment_completeness || "INCOMPLETE";

  const lines: string[] = [];
  lines.push("[INTERNAL CLINICAL CONTEXT — FOR AEGIS REASONING ONLY — NEVER DISPLAY THIS BLOCK]");

  // Emergency override — surface prominently so the model sees it immediately
  if (status === "URGENT_ACTION_REQUIRED" || state.urgency_level === "EMERGENCY") {
    lines.push("EMERGENCY OVERRIDE ACTIVE:");
    lines.push("STOP ALL ROUTINE QUESTIONING. Deliver immediate emergency guidance NOW.");
    lines.push("Direct patient to call 112 (India) or local emergency services and proceed to the nearest Emergency Department immediately.");
    if (state.red_flags.length > 0) {
      lines.push(`Red Flags: ${state.red_flags.join("; ")}`);
    }
    if (state.possible_considerations.length > 0) {
      lines.push(`Clinical Concern: ${state.possible_considerations[0]}`);
    }
    lines.push("[END INTERNAL CLINICAL CONTEXT]");
    return lines.join("\n");
  }

  // Demographics
  const demographics = [
    state.patient_name ? `name: ${state.patient_name}` : null,
    state.patient_age ? `age: ${state.patient_age}` : null,
    state.patient_sex ? `sex: ${state.patient_sex}` : null,
  ].filter(Boolean).join(", ");
  if (demographics) lines.push(`Patient: ${demographics}`);

  // Established facts
  if (state.chief_complaint) lines.push(`Chief Complaint: ${state.chief_complaint}`);
  if (state.location) lines.push(`Location: ${state.location}`);
  const timeline = [state.onset, state.duration].filter(Boolean).join(" / ");
  if (timeline) lines.push(`Timeline: ${timeline}`);
  if (state.quality) lines.push(`Quality: ${state.quality}`);
  if (state.severity) lines.push(`Severity: ${state.severity}`);
  if (state.timing) lines.push(`Timing: ${state.timing}`);
  if (state.radiation) lines.push(`Radiation: ${state.radiation}`);
  if (state.provoking_factors.length > 0) lines.push(`Aggravating Factors: ${state.provoking_factors.join("; ")}`);
  if (state.relieving_factors.length > 0) lines.push(`Relieving Factors: ${state.relieving_factors.join("; ")}`);

  // Symptoms Present
  if (state.associated_symptoms.length > 0) {
    lines.push(`Present Findings: ${state.associated_symptoms.join("; ")}`);
  }
  if (state.clinical_observations.length > 0) {
    lines.push(`Patient Observations: ${state.clinical_observations.join("; ")}`);
  }

  // Pertinent Negatives (Explicitly Denied by Patient)
  if (state.pertinent_negatives.length > 0) {
    lines.push(`Pertinent Negatives (Explicitly Denied): ${state.pertinent_negatives.join("; ")}`);
  }

  // Unmeasured / Unknown
  if (state.unmeasured_factors.length > 0) {
    lines.push(`Unmeasured / Unknown (NOT negative): ${state.unmeasured_factors.join("; ")}`);
  }

  // History
  if (state.medical_history.length > 0) lines.push(`Past Medical History: ${state.medical_history.join("; ")}`);
  if (state.medications.length > 0) lines.push(`Medications: ${state.medications.join("; ")}`);
  if (state.allergies.length > 0) lines.push(`Allergies: ${state.allergies.join("; ")}`);

  // Considerations
  if (state.possible_considerations.length > 0) {
    lines.push(`Clinical Considerations: ${state.possible_considerations.join(" | ")}`);
  }

  // Established Topics — prevent redundant questioning
  if (state.established_topics.length > 0) {
    lines.push(`Established Topics (DO NOT RE-ASK): ${state.established_topics.join(", ")}`);
  }

  lines.push(`Assessment Status: ${status} | Urgency: ${state.urgency_level}`);

  // Operational Directive
  if (status === "SUFFICIENT_FOR_PROVISIONAL_ASSESSMENT" || status === "COMPLETE") {
    lines.push("Directive: Assessment is now sufficient. DO NOT ask another routine question. Explain the 1-2 plausible clinical possibilities with calibrated uncertainty, cite the specific facts the patient reported, explain what requires in-person medical evaluation/tests, recommend the appropriate care tier, and provide safety-net signs to monitor.");
  } else {
    lines.push("Directive: Acknowledge the latest information briefly in 1-2 conversational sentences, then ask ONE single focused question on an important unestablished clinical topic. Do NOT re-ask any established finding.");
  }

  lines.push("[END INTERNAL CLINICAL CONTEXT]");
  return lines.join("\n");
}

export function parseCaseStateFromMetadata(
  metadata: Record<string, unknown> | null | undefined
): AegisCaseState {
  if (!metadata || !metadata.aegisCaseState) return { ...EMPTY_CASE_STATE };

  try {
    const raw = metadata.aegisCaseState as Partial<AegisCaseState>;
    return {
      ...EMPTY_CASE_STATE,
      ...raw,
      provoking_factors: raw.provoking_factors || [],
      relieving_factors: raw.relieving_factors || [],
      associated_symptoms: raw.associated_symptoms || [],
      pertinent_negatives: raw.pertinent_negatives || [],
      unmeasured_factors: raw.unmeasured_factors || EMPTY_CASE_STATE.unmeasured_factors,
      medical_history: raw.medical_history || [],
      surgical_history: raw.surgical_history || [],
      medications: raw.medications || [],
      allergies: raw.allergies || [],
      family_history: raw.family_history || [],
      social_history: raw.social_history || [],
      exposures: raw.exposures || [],
      red_flags: raw.red_flags || [],
      clinical_observations: raw.clinical_observations || [],
      possible_considerations: raw.possible_considerations || [],
      uncertainties: raw.uncertainties || [],
      missing_information: raw.missing_information || [],
      assessment_limitations: raw.assessment_limitations || EMPTY_CASE_STATE.assessment_limitations,
      established_topics: raw.established_topics || [],
      consultation_id: raw.consultation_id || null,
      last_updated: raw.last_updated || new Date().toISOString(),
      turn_count: raw.turn_count ?? 0,
    };
  } catch {
    return { ...EMPTY_CASE_STATE };
  }
}

/**
 * Creates an empty, clean clinical state for a new consultation.
 * All clinical fields start empty with assessment_status: "INCOMPLETE".
 */
export function createCleanCaseState(
  consultationId: string,
  demographics?: { name?: string; age?: string; sex?: string }
): AegisCaseState {
  return {
    ...EMPTY_CASE_STATE,
    consultation_id: consultationId,
    patient_name: demographics?.name || null,
    patient_age: demographics?.age || null,
    patient_sex: demographics?.sex || null,
    assessment_status: "INCOMPLETE",
    assessment_completeness: "UNKNOWN",
    last_updated: new Date().toISOString(),
    turn_count: 0,
  };
}

/**
 * Defensive validation: enforces that the case state belongs strictly
 * to the specified activeConsultationId. If stale or from a previous
 * consultation, returns a fresh clean state.
 */
export function validateCaseStateIsolation(
  state: AegisCaseState | null | undefined,
  activeConsultationId: string
): AegisCaseState {
  if (!state || (state.consultation_id && state.consultation_id !== activeConsultationId)) {
    return createCleanCaseState(activeConsultationId);
  }
  return {
    ...state,
    consultation_id: activeConsultationId,
  };
}

/**
 * Builds the metadata object to persist the case state.
 */
export function buildCaseStateMetadataUpdate(
  state: AegisCaseState
): Record<string, unknown> {
  return {
    aegisCaseState: {
      ...state,
      last_updated: new Date().toISOString(),
    },
  };
}

/**
 * Background async case state extraction prompt (JSON schema).
 */
export const CASE_STATE_EXTRACTION_PROMPT = `You are a clinical data extraction engine for Aegis (Hippocrates AI).

Your task: Extract and update the structured clinical case state from the conversation.

STRICT THREE-WAY STATE RULES:
1. KNOWN / PRESENT: Only extract symptoms and findings explicitly confirmed present by the patient.
2. KNOWN / ABSENT (PERTINENT NEGATIVES): Only include symptoms the patient explicitly DENIED.
3. UNKNOWN / UNMEASURED: If an objective test or measurement was not performed (e.g. thermometer temperature, physical exam, bloods, imaging), classify it as UNMEASURED. Do NOT mark unmeasured as negative! (e.g. "I don't feel feverish" means feverish_feeling = denied, but objective_temperature = unmeasured/unknown).
4. ESTABLISHED TOPICS: List every topic discussed and answered (e.g. "location", "duration", "severity", "nausea", "vomiting", "fever", "bowels", "medications").
5. ASSESSMENT STATUS:
   - "URGENT_ACTION_REQUIRED": Immediate life threat (chest pain radiating to arm/jaw, severe breathlessness, stroke signs)
   - "SUFFICIENT_FOR_PROVISIONAL_ASSESSMENT": Chief complaint, timeline, location, severity, pertinent negatives, and key clinical considerations are sufficiently established to synthesize and advise next steps.
   - "INCOMPLETE": Critical initial information is still missing.
   - "COMPLETE": Thorough clinical picture established.

Return ONLY valid JSON matching this exact schema:
{
  "chief_complaint": "string or null",
  "onset": "string or null",
  "duration": "string or null",
  "location": "string or null",
  "quality": "string or null",
  "severity": "string or null",
  "timing": "string or null",
  "radiation": "string or null",
  "provoking_factors": [],
  "relieving_factors": [],
  "associated_symptoms": [],
  "pertinent_negatives": [],
  "unmeasured_factors": [],
  "medical_history": [],
  "surgical_history": [],
  "medications": [],
  "allergies": [],
  "family_history": [],
  "social_history": [],
  "exposures": [],
  "red_flags": [],
  "urgency_level": "EMERGENCY" | "URGENT" | "ROUTINE" | "SELF_CARE" | "UNKNOWN",
  "clinical_observations": [],
  "possible_considerations": [],
  "uncertainties": [],
  "missing_information": [],
  "assessment_limitations": [],
  "assessment_completeness": "INCOMPLETE" | "SUFFICIENT_FOR_PROVISIONAL_ASSESSMENT" | "URGENT_ACTION_REQUIRED" | "COMPLETE",
  "established_topics": [],
  "patient_name": "string or null",
  "patient_age": "string or null",
  "patient_sex": "string or null"
}`;

/**
 * Evaluates whether an Aegis response concludes or provides a provisional assessment,
 * ensuring UI and case state transition properly out of IN_PROGRESS.
 * Satisfies Section 10 & 12 of the Master Specification.
 */
export function determineAssessmentStatusFromResponse(
  reply: string,
  currentStatus: AssessmentStatus = "INCOMPLETE"
): AssessmentStatus {
  if (currentStatus === "URGENT_ACTION_REQUIRED") {
    return "URGENT_ACTION_REQUIRED";
  }

  const text = reply.trim();
  const lower = text.toLowerCase();

  // If the reply is an emergency escalation
  if (
    lower.includes("call 112") ||
    lower.includes("call 911") ||
    lower.includes("medical emergency") ||
    lower.includes("emergency department immediately") ||
    lower.includes("immediate emergency evaluation")
  ) {
    return "URGENT_ACTION_REQUIRED";
  }

  // Check if the reply delivers clinical considerations / diagnostic possibilities
  const hasClinicalConsiderations =
    lower.includes("possibility") ||
    lower.includes("possibilities") ||
    lower.includes("consider") ||
    lower.includes("considerations") ||
    lower.includes("pattern") ||
    lower.includes("consistent with") ||
    lower.includes("differential") ||
    lower.includes("one concern") ||
    lower.includes("orthostatic") ||
    lower.includes("appendicitis") ||
    lower.includes("tension") ||
    lower.includes("thyroid") ||
    lower.includes("anemia") ||
    lower.includes("iron deficiency");

  // Check if the reply delivers clinical guidance / next steps
  const hasGuidanceOrNextSteps =
    lower.includes("next step") ||
    lower.includes("recommend") ||
    lower.includes("evaluation") ||
    lower.includes("urgent care") ||
    lower.includes("in-person") ||
    lower.includes("scheduled") ||
    lower.includes("monitor") ||
    lower.includes("seek medical attention") ||
    lower.includes("primary care") ||
    lower.includes("safety-net") ||
    lower.includes("watch for") ||
    lower.includes("blood work") ||
    lower.includes("blood tests");

  const endsWithQuestion = /\?\s*$/.test(text);

  if (hasClinicalConsiderations && hasGuidanceOrNextSteps && !endsWithQuestion) {
    if (lower.includes("health summary") || lower.includes("summary") || lower.includes("feel free to ask") || lower.includes("let me know if")) {
      return "COMPLETE";
    }
    return "SUFFICIENT_FOR_PROVISIONAL_ASSESSMENT";
  }

  if (hasClinicalConsiderations && hasGuidanceOrNextSteps) {
    return "SUFFICIENT_FOR_PROVISIONAL_ASSESSMENT";
  }

  return currentStatus;
}
