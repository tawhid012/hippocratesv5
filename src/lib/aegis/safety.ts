import type { SafetyEvaluation } from "@/lib/types";

// ============================================================
// AEGIS SAFETY EVALUATION ENGINE
// Deterministic pattern-based pre-screening for clinical urgency.
// LLM-based safety is handled by the system prompt.
// This layer catches obvious emergencies before the LLM responds.
// ============================================================

// EMERGENCY: Immediate life-threatening presentations
const EMERGENCY_PATTERNS = [
  // Cardiac
  /\bchest pain\b/i,
  /\bcrushing chest\b/i,
  /\bchest pressure\b/i,
  /\bpressure in (my|the) chest\b/i,
  /\bpain (radiating|spreading|going) to (arm|left arm|jaw|back|neck|shoulder)\b/i,
  /\bspreading to (my )?(arm|left arm|jaw|back|neck|shoulder)\b/i,
  /\b(chest|heart) (pain|pressure|tightness) (with|and) (sweating|nausea|shortness|left arm|arm|jaw)\b/i,
  /\bleft arm (pain|ache|numb|tingling)\b/i,
  /\bjaw (pain|ache|tightness) (with|and) chest\b/i,
  /\bheart attack\b/i,
  /\bcardiac arrest\b/i,
  /\bpalpitations with (dizziness|syncope|fainting|collapse)\b/i,

  // Respiratory
  /\b(severe|can't|cannot|unable to) (breathe|breath|breathing)\b/i,
  /\bshortness of breath at rest\b/i,
  /\bcan'?t breathe\b/i,
  /\bbreathing (stopped|stopped|not breathing)\b/i,
  /\bsuffocating\b/i,
  /\bairway (blocked|obstruction)\b/i,

  // Neurological / Stroke
  /\bsudden (weakness|numbness) (on one side|arm|leg|face)\b/i,
  /\bslurred speech\b/i,
  /\bfacial drooping\b/i,
  /\bface (drooping|falling|numb|paralysed|paralyzed)\b/i,
  /\bstroke\b/i,
  /\bsudden (severe|worst) headache\b/i,
  /\bthunderclap headache\b/i,
  /\bworst headache of (my|his|her|their) life\b/i,
  /\bworst headache i('ve| have) (ever|had)\b/i,
  /\bnever had a headache like this (before)?\b/i,
  // Thunderclap equivalents — natural language descriptions of sudden maximal-onset headache
  // These are clinically equivalent to "thunderclap" and MUST trigger emergency routing
  /\b(peaked|reached|hit) (its |full |maximum )?(intensity|severity|peak) (in|within) (seconds?|a second|moments?|an instant)\b/i,
  /\b(became|went|was) (extremely|very|severely|excruciatingly|suddenly)? ?(severe|excruciating|agonizing|unbearable) (in|within) (seconds?|a second|moments?)\b/i,
  /\bmaximum intensity (in|within) (seconds?|a few seconds|moments?)\b/i,
  /\bextremely severe within (about |around |approximately )?(seconds?|a few seconds|a second|moments?)\b/i,
  /\b(hit|struck|came on) (me )?(instantly|in seconds|out of nowhere|like a thunderclap|like an explosion)\b/i,
  /\bheadache.{0,40}(within|in) (a few |about |around )?(seconds?|a second)\b/i,
  /\b(10|ten|5|five|15|fifteen|30|thirty) seconds?.{0,30}(headache|head pain|pain in my head)\b/i,

  // Loss of consciousness
  /\blost consciousness\b/i,
  /\bpassed out\b/i,
  /\bfainted\b/i,
  /\bunconscious\b/i,
  /\bnot responding\b/i,
  /\bnot waking up\b/i,

  // Bleeding
  /\buncontrolled bleeding\b/i,
  /\bcoughing up blood\b/i,
  /\bvomiting blood\b/i,
  /\bhematemesis\b/i,
  /\bbright red blood from (mouth|rectum|anus)\b/i,
  /\bmassive (blood|haemorrhage|hemorrhage)\b/i,

  // Seizure
  /\bseizure\b/i,
  /\bfit (started|happening|won't stop)\b/i,
  /\bconvulsions\b/i,

  // Allergic / Anaphylaxis
  /\banaphylaxis\b/i,
  /\bswelling of throat\b/i,
  /\bswelling of tongue\b/i,
  /\bthroat (closing|closing up|swelling shut)\b/i,
  /\bsevere allergic reaction\b/i,
  /\bcannot swallow\b/i,

  // Overdose / Poisoning
  /\boverdose\b/i,
  /\btook too many (tablets|pills|medicines|medications)\b/i,
  /\bpoisoning\b/i,
  /\bswallowed (something toxic|bleach|acid|chemicals)\b/i,
  /\baccidental (ingestion|poisoning)\b/i,

  // Trauma
  /\bsevere head injury\b/i,
  /\bhead trauma (with|and) (unconscious|seizure|confusion)\b/i,
  /\bspinal injury\b/i,

  // Mental health emergency
  /\bwant to (end my life|kill myself|suicide|self-harm immediately)\b/i,
  /\bsuicidal (thoughts|ideation) (with plan|right now|tonight)\b/i,
  /\bhaving a (panic attack|mental breakdown) (can't breathe)\b/i,

  // Obstetric
  /\bheavy bleeding (during|in) pregnancy\b/i,
  /\beclampsia\b/i,
  /\bsevere (headache|vision changes|swelling) (during|in) pregnancy\b/i,

  // Abdominal emergency
  /\bsudden severe abdominal pain\b/i,
  /\bstomach (burst|ruptured)\b/i,
];

// WARNING: Urgent but not immediately life-threatening
const WARNING_PATTERNS = [
  // Fever
  /\bhigh fever\b/i,
  /\bfever (over|above|more than) (103|104|39\.5|40|41)\b/i,
  /\bfever for (more than|over|>) (3|4|5|6|7) days?\b/i,
  /\bfever (not (coming down|going down|responding))\b/i,
  /\bfever with (rash|stiff neck|confusion)\b/i,

  // Abdominal
  /\bsevere abdominal pain\b/i,
  /\bright lower (abdominal|stomach|side) pain\b/i,
  /\bappendix\b/i,
  /\bblack stools\b/i,
  /\btarry stools\b/i,
  /\bblood in stool\b/i,
  /\bblood in urine\b/i,
  /\bhaematuria\b/i,
  /\bhaematochezia\b/i,
  /\bmelena\b/i,

  // Neurological warning
  /\bworst headache\b/i,
  /\bsudden vision loss\b/i,
  /\bdouble vision\b/i,
  /\bnumbness (spreading|worsening|all over)\b/i,
  /\bconfusion (worsening|sudden|severe)\b/i,

  // Respiratory warning
  /\bbreathing difficulty\b/i,
  /\bdifficulty breathing\b/i,
  /\bchest tightness\b/i,
  /\bwheezing (with difficulty)\b/i,
  /\bblood in phlegm\b/i,
  /\bcoughing blood\b/i,

  // Fluid / Hydration
  /\binability to keep fluids down\b/i,
  /\bsevere dehydration\b/i,
  /\bnot (eating|drinking) for (2|3|4|5) days?\b/i,

  // Musculoskeletal / Mobility
  /\bcan'?t (walk|stand|move)\b/i,
  /\bunable to (walk|stand|move)\b/i,

  // Lab critical flags
  /\bcritically (low|high)\b/i,
  /\b(glucose|sugar) (very (low|high)|critically)\b/i,

  // Mental health warning
  /\bsuicidal (thoughts|ideation)\b/i,
  /\bthinking of (harming|hurting) (myself|himself|herself)\b/i,
  /\bself.harm\b/i,

  // Medication concern
  /\btook (too many|wrong|extra) (tablets|pills|medicines|medications)\b/i,
  /\breaction to (medication|medicine|drug)\b/i,

  // Pregnancy
  /\bbleeding in pregnancy\b/i,
  /\bpain in pregnancy\b/i,
  /\bcontractions (early|preterm|too early)\b/i,
];

/**
 * Checks if a matched clinical indicator in text is explicitly negated, denied, or phrased as a question.
 * Satisfies Sections 17 & 18: Asking about a red flag must never trigger emergency mode,
 * and explicitly negative findings must close/avoid emergency alerts.
 */
function isMatchNegatedOrQuestioned(text: string, matchIndex: number, matchLength: number): boolean {
  const fullText = text.trim();

  // 1. Question detection: a question is not a patient's statement of fact
  if (
    fullText.endsWith("?") ||
    /^(?:have you|do you|are you|did you|has there|is there|could you|would you|have they|has the patient|did the patient)\b/i.test(fullText)
  ) {
    return true;
  }

  // 2. Preceding negation check (within the clause before match)
  const prefix = text.slice(0, matchIndex);
  // Break on sentence boundaries OR contrastive conjunctions ("but", "however", "although", "except")
  const clause = prefix.split(/[.;\n]|(?:\b(?:but|however|except|although)\b)/i).pop() || "";

  const negationPattern = /\b(?:no|not|never|neither|nor|without|haven't|hasn't|don't|doesn't|didn't|won't|can't|cannot|deny|denies|denied|negative|zero)\b/i;
  if (negationPattern.test(clause)) {
    return true;
  }

  // 3. Suffix negation check: e.g. "chest pain: denied", "chest pain is absent"
  const suffix = text.slice(matchIndex + matchLength, Math.min(text.length, matchIndex + matchLength + 30));
  if (/^[:\s-]*(?:no|none|negative|denied|absent|not\s+present|ruled\s+out)\b/i.test(suffix)) {
    return true;
  }

  return false;
}

export function evaluateSafety(input: string, labResultsSummary?: string): SafetyEvaluation {
  const combinedText = `${input} ${labResultsSummary || ""}`.toLowerCase();

  const emergencyReasons: string[] = [];
  const warningReasons: string[] = [];

  for (const pattern of EMERGENCY_PATTERNS) {
    const match = combinedText.match(pattern);
    if (match && match.index !== undefined) {
      if (!isMatchNegatedOrQuestioned(combinedText, match.index, match[0].length)) {
        emergencyReasons.push(`Indicator detected: "${match[0]}"`);
      }
    }
  }

  for (const pattern of WARNING_PATTERNS) {
    const match = combinedText.match(pattern);
    if (match && match.index !== undefined) {
      if (!isMatchNegatedOrQuestioned(combinedText, match.index, match[0].length)) {
        warningReasons.push(`Indicator detected: "${match[0]}"`);
      }
    }
  }

  if (emergencyReasons.length > 0) {
    return {
      level: "POTENTIAL_EMERGENCY",
      reasons: emergencyReasons,
      actionRequired: "IMMEDIATE EMERGENCY MEDICAL CARE REQUIRED",
      emergencyWarning:
        "⚠️ EMERGENCY NOTICE: Your message mentions potentially serious or life-threatening symptoms. Please call 112 (India) or your local emergency number immediately, or go to the nearest Emergency Department. Do not wait.",
    };
  }

  if (warningReasons.length > 0) {
    return {
      level: "NEEDS_REVIEW",
      reasons: warningReasons,
      actionRequired: "Prompt Medical Evaluation Recommended",
      emergencyWarning:
        "ℹ️ PROMPT ATTENTION: Some symptoms or findings you mentioned warrant timely evaluation by a healthcare provider. Please do not delay if your symptoms are worsening.",
    };
  }

  return {
    level: "NORMAL",
    reasons: [],
    actionRequired: "Routine Health Information & Follow-up",
  };
}
