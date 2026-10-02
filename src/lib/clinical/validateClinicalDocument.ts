import type { NormalizedClinicalSummary } from "./types";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateClinicalDocument(summary: NormalizedClinicalSummary): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Mandatory Metadata Checks
  if (!summary.documentId) {
    errors.push("Document ID is missing.");
  }
  if (!summary.conversationId) {
    errors.push("Conversation ID is missing.");
  }
  if (!summary.generatedAt) {
    errors.push("Generation timestamp is missing.");
  }

  // 2. Mandatory Legal & Disclaimer Checks
  if (!summary.disclaimer || !summary.disclaimer.includes("Hippocrates AI")) {
    errors.push("Required Hippocrates AI legal disclaimer is missing.");
  }
  if (!summary.copyright || !summary.copyright.includes("Hippocrates AI")) {
    errors.push("Hippocrates AI copyright statement is missing.");
  }

  // 3. Prescription Draft Validation
  if (summary.prescriptionDraft && summary.prescriptionDraft.length > 0) {
    for (const item of summary.prescriptionDraft) {
      if (!item.medicine || item.medicine.trim() === "") {
        errors.push("Prescription draft item contains an empty medicine name.");
      }
      
      // Strict Check for clinician signature/approval fabrication
      const contentStr = JSON.stringify(item).toLowerCase();
      if (
        contentStr.includes("signature") || 
        contentStr.includes("dr.") || 
        contentStr.includes("doctor") || 
        contentStr.includes("license") || 
        contentStr.includes("approved by") ||
        contentStr.includes("md")
      ) {
        errors.push("Fabricated clinician approval or signature found in prescription draft.");
      }
    }
  }

  // 4. Clinical Understanding Categorization Check
  if (!summary.clinicalUnderstanding) {
    errors.push("Clinical Understanding section is missing.");
  } else {
    // 5. Clinical Terminology & Hedging Language Checks
    const explanations = summary.clinicalUnderstanding.possibleExplanations || [];
    const hasHedgingLanguage = explanations.some((exp) => {
      const lower = exp.toLowerCase();
      return (
        lower.includes("may be consistent with") ||
        lower.includes("could be associated with") ||
        lower.includes("possible explanations include") ||
        lower.includes("differential") ||
        lower.includes("consider") ||
        lower.includes("suggestive of") ||
        lower.includes("suspected") ||
        lower.includes("potential")
      );
    });

    if (explanations.length > 0 && !hasHedgingLanguage) {
      warnings.push("Clinical explanations should use non-definitive hedging language (e.g. 'may be consistent with').");
    }
  }

  // 6. Incomplete Field Warnings
  if (!summary.patient?.name) {
    warnings.push("Patient name not provided during conversation.");
  }
  if (!summary.symptoms?.primarySymptom) {
    warnings.push("Primary symptom not explicitly specified.");
  }

  // 7. Safety Warning Presence Check
  if (!summary.safetyWarnings || summary.safetyWarnings.length === 0) {
    warnings.push("No safety warnings or red flag indicators provided in this document.");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
