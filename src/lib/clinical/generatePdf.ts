import { jsPDF } from "jspdf";
import type { NormalizedClinicalSummary } from "./types";
import fs from "fs";
import path from "path";

export function generatePdfBlob(summary: NormalizedClinicalSummary): Blob {
  const doc = new jsPDF({
    unit: "mm",
    format: "a4",
    orientation: "portrait",
  });

  // Try to load Hippocrates logo base64 synchronously on the server-side
  let logoBase64: string | null = null;
  try {
    const logoPath = path.join(process.cwd(), "public", "logo.jpg");
    if (fs.existsSync(logoPath)) {
      const fileBuffer = fs.readFileSync(logoPath);
      logoBase64 = `data:image/jpeg;base64,${fileBuffer.toString("base64")}`;
    }
  } catch (err) {
    console.warn("Failed to load logo from filesystem in PDF generator:", err);
  }

  const pageWidth = doc.internal.pageSize.getWidth(); // ~210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // ~297mm
  const margin = 15;
  const contentWidth = pageWidth - margin * 2; // ~180mm

  let y = margin;

  // Helpers
  const checkPageOverflow = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 20) {
      doc.addPage();
      y = margin + 14; // leave room for running header on continuation pages
    }
  };

  const drawHeaderFooter = () => {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);

      // Running Header (pages > 1)
      if (i > 1) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139); // Slate-500
        doc.text("HIPPOCRATES AI CLINICAL PLATFORM", margin, 10);
        doc.setFont("helvetica", "normal");
        doc.text(`Doc ID: ${summary.documentId}`, pageWidth - margin, 10, { align: "right" });
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(margin, 12, pageWidth - margin, 12);
      }

      // Running Footer (every page)
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184); // Slate-400
      doc.text("Hippocrates AI  •  AI-Generated Clinical Assessment", margin, pageHeight - 8);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 8, { align: "right" });
    }
  };


  // --- 1. COVER / HEADER BANNER ---
  // Top Emerald Accent Bar
  doc.setFillColor(5, 150, 105); // Emerald-600 (#059669)
  doc.rect(margin, y, contentWidth, 3, "F");
  y += 7;

  // Render logo on left if available
  if (logoBase64) {
    try {
      // logo is ~48x32. Renders as 15mm width, 10mm height
      doc.addImage(logoBase64, "JPEG", margin, y, 15, 10);
    } catch (e) {
      console.warn("Failed to draw logo inside PDF:", e);
    }
  }

  // Branding text
  const brandX = logoBase64 ? margin + 18 : margin;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.text("HIPPOCRATES", brandX, y + 6);

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.text("AI CLINICAL PLATFORM", brandX + 46, y + 5.5);

  y += 14;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(51, 65, 85); // Slate-700
  const docTitle = summary.conversationTitle || "Clinical Conversation Summary & Care Plan";
  doc.text(docTitle, margin, y);

  // Status Badge on Right
  doc.setFillColor(241, 245, 249); // Slate-100
  doc.setDrawColor(203, 213, 225); // Slate-300
  doc.roundedRect(pageWidth - margin - 52, y - 10, 52, 10, 2, 2, "FD");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("STATUS: " + summary.status, pageWidth - margin - 26, y - 4, { align: "center" });

  y += 6;
  doc.setDrawColor(203, 213, 225); // Slate-300
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // --- 2. PATIENT & SESSION METADATA BOX ---
  checkPageOverflow(30);
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, "FD");

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);

  // Col 1
  doc.setFont("helvetica", "bold");
  doc.text("PATIENT INFORMATION", margin + 4, y + 5);
  doc.setFont("helvetica", "normal");
  doc.text(`Name: ${summary.patient?.name || "Not provided"}`, margin + 4, y + 10);
  doc.text(`Age: ${summary.patient?.age || "Not provided"}`, margin + 4, y + 15);
  doc.text(`Sex: ${summary.patient?.sex || "Not provided"}`, margin + 4, y + 20);

  // Col 2
  const col2X = margin + 65;
  doc.setFont("helvetica", "bold");
  doc.text("SESSION DETAILS", col2X, y + 5);
  doc.setFont("helvetica", "normal");
  doc.text(`Model: ${summary.model}`, col2X, y + 10);
  doc.text(`Date: ${new Date(summary.generatedAt).toLocaleDateString()}`, col2X, y + 15);
  doc.text(`Time: ${new Date(summary.generatedAt).toLocaleTimeString()}`, col2X, y + 20);

  // Col 3
  const col3X = margin + 125;
  doc.setFont("helvetica", "bold");
  doc.text("METADATA", col3X, y + 5);
  doc.setFont("helvetica", "normal");
  doc.text(`Doc ID: ${summary.documentId}`, col3X, y + 10);
  doc.text(`Conv ID: ${summary.conversationId.slice(0, 12)}...`, col3X, y + 15);
  if (summary.elevenlabsConversationId) {
    doc.text(`Voice ID: ${summary.elevenlabsConversationId.slice(0, 10)}...`, col3X, y + 20);
  }

  y += 28;

  // Risk Status badge in metadata box (if available)
  if (summary.riskStatus && summary.riskStatus !== "UNKNOWN") {
    checkPageOverflow(12);
    const riskColors: Record<string, [number, number, number]> = {
      EMERGENCY: [220, 38, 38],
      URGENT: [217, 119, 6],
      ROUTINE: [37, 99, 235],
      SELF_CARE: [5, 150, 105],
    };
    const riskColor = riskColors[summary.riskStatus] || [71, 85, 105];
    doc.setFillColor(...riskColor);
    doc.roundedRect(margin, y, contentWidth, 8, 1, 1, "F");
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(
      `ASSESSMENT STATUS: ${summary.riskStatus}  —  ${summary.clinicalSnapshot?.urgencyStatement || ""}`,
      margin + contentWidth / 2,
      y + 5.5,
      { align: "center", maxWidth: contentWidth - 4 }
    );
    y += 12;
  }

  // --- SECTION DRAWING HELPER ---
  const drawSectionHeader = (title: string, accentColor = [5, 150, 105]) => {
    checkPageOverflow(14);
    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.rect(margin, y, 2.5, 5, "F");

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(title.toUpperCase(), margin + 5, y + 4);
    y += 8;
  };

  const drawParagraph = (text: string) => {
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    const lines = doc.splitTextToSize(text, contentWidth);
    checkPageOverflow(lines.length * 4 + 2);
    doc.text(lines, margin, y);
    y += lines.length * 4 + 3;
  };

  const drawBulletList = (items: string[]) => {
    if (!items || items.length === 0) return;
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);

    for (const item of items) {
      const lines = doc.splitTextToSize(`• ${item}`, contentWidth - 4);
      checkPageOverflow(lines.length * 4 + 1);
      doc.text(lines, margin + 2, y);
      y += lines.length * 4 + 1.5;
    }
    y += 2;
  };

  // --- B. CLINICAL SNAPSHOT ---
  if (summary.clinicalSnapshot) {
    const snap = summary.clinicalSnapshot;
    checkPageOverflow(50);
    doc.setFillColor(241, 245, 249); // Slate-50
    doc.setDrawColor(203, 213, 225);
    const snapStartY = y;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(5, 150, 105); // Emerald
    doc.text("CLINICAL SNAPSHOT", margin + 5, y + 6);
    doc.setFillColor(5, 150, 105);
    doc.rect(margin, y, 2.5, 5, "F");
    y += 10;

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("Primary Concern:", margin, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    const concernLines = doc.splitTextToSize(snap.primaryConcern, contentWidth - 40);
    doc.text(concernLines, margin + 38, y);
    y += Math.max(concernLines.length * 4, 5);

    if (snap.durationSummary) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text("Duration:", margin, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);
      doc.text(snap.durationSummary, margin + 38, y);
      y += 5;
    }
    if (snap.severitySummary) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text("Severity:", margin, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);
      doc.text(snap.severitySummary, margin + 38, y);
      y += 5;
    }
    if (snap.keyPositiveFindings && snap.keyPositiveFindings.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text("Key Findings:", margin, y);
      y += 4;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);
      for (const f of snap.keyPositiveFindings) {
        const fl = doc.splitTextToSize(`+ ${f}`, contentWidth - 4);
        checkPageOverflow(fl.length * 4 + 1);
        doc.text(fl, margin + 2, y);
        y += fl.length * 4 + 1;
      }
    }
    if (snap.keyNegativeFindings && snap.keyNegativeFindings.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text("Pertinent Negatives:", margin, y);
      y += 4;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      for (const f of snap.keyNegativeFindings) {
        const fl = doc.splitTextToSize(`– ${f}`, contentWidth - 4);
        checkPageOverflow(fl.length * 4 + 1);
        doc.text(fl, margin + 2, y);
        y += fl.length * 4 + 1;
      }
    }
    if (snap.keyClinicalConsideration) {
      y += 2;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      const keyLines = doc.splitTextToSize(`Key consideration: ${snap.keyClinicalConsideration}`, contentWidth - 4);
      checkPageOverflow(keyLines.length * 4 + 3);
      doc.text(keyLines, margin + 2, y);
      y += keyLines.length * 4 + 3;
    }

    // Draw box around snapshot section
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, snapStartY - 2, contentWidth, y - snapStartY + 4, 2, 2, "S");
    y += 8;
  }

  // --- C. REASON FOR CONSULTATION ---
  drawSectionHeader("Reason for Assessment");
  drawParagraph(summary.consultationReason);

  // --- C. PRESENTING SYMPTOMS ---
  drawSectionHeader("Presenting Symptoms");
  const sym = summary.symptoms;
  drawParagraph(`Primary Symptom: ${sym.primarySymptom}`);
  if (sym.duration || sym.severity || sym.frequency) {
    drawParagraph(`Duration: ${sym.duration || "Not specified"}  |  Severity: ${sym.severity || "Not specified"}  |  Frequency: ${sym.frequency || "Not specified"}`);
  }
  if (sym.associatedSymptoms && sym.associatedSymptoms.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.text("Associated Symptoms:", margin, y);
    y += 4;
    drawBulletList(sym.associatedSymptoms);
  }

  // --- C.2 PERTINENT NEGATIVES ---
  if (summary.pertinentNegatives && summary.pertinentNegatives.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text("Pertinent Negatives (Patient Specifically Denied):", margin, y);
    y += 4;
    drawBulletList(summary.pertinentNegatives);
  }

  // --- D. RELEVANT HISTORY ---
  drawSectionHeader("Relevant History");
  const hist = summary.history;
  const historyParts: string[] = [];
  if (hist.previousConditions?.length) historyParts.push(`Prior Conditions: ${hist.previousConditions.join(", ")}`);
  if (hist.currentMedications?.length) historyParts.push(`Current Medications: ${hist.currentMedications.join(", ")}`);
  if (hist.allergies?.length) historyParts.push(`Allergies: ${hist.allergies.join(", ")}`);
  if (hist.recentIllnessExposure) historyParts.push(`Recent Exposure/Illness: ${hist.recentIllnessExposure}`);
  if (hist.lifestyleFactors) historyParts.push(`Lifestyle: ${hist.lifestyleFactors}`);

  if (historyParts.length > 0) {
    drawBulletList(historyParts);
  } else {
    drawParagraph("Not provided during the conversation.");
  }

  // --- E. CLINICAL CONSIDERATIONS ---
  if (summary.clinicalConsiderations && summary.clinicalConsiderations.length > 0) {
    drawSectionHeader("Clinical Considerations", [71, 85, 105]);

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 116, 139);
    drawParagraph("The following are clinical possibilities being considered based on available patient-reported information. These are NOT confirmed diagnoses.");

    for (let ci = 0; ci < summary.clinicalConsiderations.length; ci++) {
      const cons = summary.clinicalConsiderations[ci];
      checkPageOverflow(20);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(`${ci + 1}. ${cons.name}`, margin, y);
      y += 5;

      if (cons.clinicalNote) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        const noteLines = doc.splitTextToSize(cons.clinicalNote, contentWidth - 4);
        checkPageOverflow(noteLines.length * 4 + 2);
        doc.text(noteLines, margin + 2, y);
        y += noteLines.length * 4 + 2;
      }
      if (cons.supportingFeatures && cons.supportingFeatures.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(51, 65, 85);
        doc.text("Supporting features:", margin + 2, y);
        y += 4;
        for (const sf of cons.supportingFeatures) {
          const sfl = doc.splitTextToSize(`• ${sf}`, contentWidth - 8);
          checkPageOverflow(sfl.length * 4);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(51, 65, 85);
          doc.text(sfl, margin + 4, y);
          y += sfl.length * 4 + 1;
        }
      }
      if (cons.uncertaintyNotes && cons.uncertaintyNotes.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text("Not established / uncertainty:", margin + 2, y);
        y += 4;
        for (const un of cons.uncertaintyNotes) {
          const unl = doc.splitTextToSize(`– ${un}`, contentWidth - 8);
          checkPageOverflow(unl.length * 4);
          doc.setFont("helvetica", "normal");
          doc.text(unl, margin + 4, y);
          y += unl.length * 4 + 1;
        }
      }
      y += 3;
    }
    y += 3;
  } else if (summary.clinicalUnderstanding?.possibleExplanations?.length) {
    // Fallback to Phase 1 possible explanations if no Phase 2 considerations
    drawSectionHeader("Clinical Considerations", [71, 85, 105]);
    drawBulletList(summary.clinicalUnderstanding.possibleExplanations);
  }

  // --- H. FINDINGS FROM UPLOADED REPORTS ---
  if (summary.reportFindings && summary.reportFindings.length > 0) {
    drawSectionHeader("Findings From Uploaded Reports");
    for (const f of summary.reportFindings) {
      drawParagraph(`• ${f.testName}: ${f.resultValue} ${f.referenceRange ? `(Ref: ${f.referenceRange})` : ""} - ${f.interpretation || "AI-assisted interpretation"}`);
    }
  }

  // --- F.2 DOCTOR / ORACLE CLINICAL HANDOFF ---
  if (summary.drNote) {
    drawSectionHeader("DOCTOR / ORACLE CLINICAL HANDOFF");
    drawParagraph(summary.drNote);

    
    // Subtle warning label
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text("AI-generated clinical note — not clinician-authored or independently verified.", margin, y);
    y += 6;
  }

  // --- F.3 INFORMATION GAPS ---
  if (summary.informationGaps && summary.informationGaps.length > 0) {
    drawSectionHeader("Information Gaps", [100, 116, 139]);
    drawBulletList(summary.informationGaps);
  }

  // --- F.4 ASSESSMENT LIMITATIONS ---
  const limitations = summary.assessmentLimitations && summary.assessmentLimitations.length > 0
    ? summary.assessmentLimitations
    : ["Physical examination not performed", "Vital signs not measured", "No laboratory tests performed", "No imaging or ECG performed"];
  drawSectionHeader("Assessment Limitations", [100, 116, 139]);
  drawBulletList(limitations);

  // --- G. CARE & SELF-MANAGEMENT GUIDANCE ---
  drawSectionHeader("Care & Self-Management Guidance");
  drawBulletList(summary.guidance);

  // --- H. MEDICATION DISCUSSION ---
  if (summary.medicationDiscussion && summary.medicationDiscussion.length > 0) {
    drawSectionHeader("Medication Discussion");
    for (const med of summary.medicationDiscussion) {
      drawParagraph(`• ${med.medication} — Purpose: ${med.purpose || "Not specified"} | Dose: ${med.dose || "Not specified"} | Freq: ${med.frequency || "Not specified"}`);
    }
  }

  // --- I. PRESCRIPTION DRAFT ---
  if (summary.hasPrescriptionDraft && summary.prescriptionDraft && summary.prescriptionDraft.length > 0) {
    checkPageOverflow(40);
    drawSectionHeader("PRESCRIPTION DRAFT — CLINICIAN REVIEW REQUIRED", [225, 29, 72]); // Red accent

    // Distinct Box
    doc.setFillColor(254, 242, 242); // Red-50
    doc.setDrawColor(252, 165, 165); // Red-300
    doc.roundedRect(margin, y, contentWidth, 12 + summary.prescriptionDraft.length * 10, 2, 2, "FD");

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(185, 28, 28); // Red-700
    doc.text("THIS IS NOT A VALID MEDICAL PRESCRIPTION. REQUIRES LICENSED CLINICIAN AUTHORIZATION.", margin + 4, y + 6);

    let py = y + 12;
    for (const rx of summary.prescriptionDraft) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(`Medicine: ${rx.medicine} (${rx.strength || "Strength unspecified"})`, margin + 4, py);
      doc.setFont("helvetica", "normal");
      doc.text(`Route: ${rx.route || "Oral"} | Frequency: ${rx.frequency || "As directed"} | Duration: ${rx.duration || "As directed"}`, margin + 4, py + 4);
      py += 9;
    }

    y = py + 4;
  }

  // --- J. SAFETY & EMERGENCY INFORMATION ---
  drawSectionHeader("Red-Flag & Emergency Safety Information", [220, 38, 38]);
  drawBulletList(summary.safetyWarnings);

  // --- K. FOLLOW-UP PLAN ---
  drawSectionHeader("Follow-Up Plan");
  const fu = summary.followUp;
  if (fu.recommendedMonitoring) drawParagraph(`Recommended Monitoring: ${fu.recommendedMonitoring}`);
  if (fu.suggestedFollowUp) drawParagraph(`Suggested Follow-Up: ${fu.suggestedFollowUp}`);
  if (fu.whenToSeekCare) drawParagraph(`When to Seek Care: ${fu.whenToSeekCare}`);

  // --- L. LEGAL DISCLAIMER & COPYRIGHT BOX ---
  checkPageOverflow(30);
  y += 4;
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, 26, 2, 2, "FD");

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("IMPORTANT LEGAL DISCLAIMER", margin + 4, y + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  const disclaimerLines = doc.splitTextToSize(summary.disclaimer, contentWidth - 8);
  doc.text(disclaimerLines, margin + 4, y + 9);

  doc.setFont("helvetica", "bold");
  doc.text(summary.copyright, margin + 4, y + 23);

  // Finish Header & Footers across all pages
  drawHeaderFooter();

  return doc.output("blob");
}
