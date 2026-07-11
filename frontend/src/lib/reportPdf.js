import { jsPDF } from "jspdf";

import {
  buildReportSummary,
  formatReportDateTime,
  formatReportValue,
  getDisplayConfidence,
  getPossibleDiseases,
  getPrimaryDiagnosis,
  getSeverityMeta,
} from "@/lib/reportUtils";

const PAGE = {
  width: 595.28,
  height: 841.89,
  margin: 46,
  contentTop: 118,
  footerHeight: 38,
};

function createFileName(report) {
  const stamp = String(report?.created_at || "")
    .replace(/[:/\\]/g, "-")
    .replace(/\s+/g, "_")
    .slice(0, 19);
  return `medassist-report-${report?.id || "summary"}-${stamp || "download"}.pdf`;
}

function ensureSpace(doc, state, height, report) {
  if (state.cursorY + height <= PAGE.height - PAGE.margin - PAGE.footerHeight) return;

  doc.addPage();
  state.page += 1;
  state.cursorY = PAGE.contentTop;
  drawHeader(doc, report, state.page);
}

function drawHeader(doc, report, page) {
  doc.setFillColor(17, 32, 51);
  doc.roundedRect(PAGE.margin, 38, 42, 42, 12, 12, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("M", PAGE.margin + 21, 64, { align: "center" });

  doc.setTextColor(17, 32, 51);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("MedAssist Medical Report", PAGE.margin + 56, 56);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(88, 107, 126);
  doc.text(`Report ID: ${report?.id || "Unknown"}`, PAGE.margin + 56, 74);
  doc.text(`Generated: ${formatReportDateTime(report?.created_at)}`, PAGE.width - PAGE.margin, 56, { align: "right" });
  doc.text(`Page ${page}`, PAGE.width - PAGE.margin, 74, { align: "right" });

  doc.setDrawColor(214, 223, 230);
  doc.line(PAGE.margin, 96, PAGE.width - PAGE.margin, 96);
}

function drawFooter(doc, page, totalPages) {
  doc.setDrawColor(214, 223, 230);
  doc.line(PAGE.margin, PAGE.height - 56, PAGE.width - PAGE.margin, PAGE.height - 56);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(88, 107, 126);
  doc.text(
    "MedAssist AI-generated summary. Always confirm urgent or ongoing symptoms with a licensed clinician.",
    PAGE.margin,
    PAGE.height - 38
  );
  doc.text(`Page ${page} of ${totalPages}`, PAGE.width - PAGE.margin, PAGE.height - 38, { align: "right" });
}

function addSectionHeading(doc, state, title, report) {
  ensureSpace(doc, state, 28, report);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(17, 32, 51);
  doc.text(title, PAGE.margin, state.cursorY);
  state.cursorY += 8;
  doc.setDrawColor(214, 223, 230);
  doc.line(PAGE.margin, state.cursorY, PAGE.width - PAGE.margin, state.cursorY);
  state.cursorY += 18;
}

function addField(doc, state, label, value, report) {
  const text = formatReportValue(value);
  const labelWidth = 134;
  const availableWidth = PAGE.width - PAGE.margin * 2 - labelWidth;
  const wrapped = doc.splitTextToSize(text, availableWidth);
  const blockHeight = Math.max(18, wrapped.length * 13);

  ensureSpace(doc, state, blockHeight + 8, report);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(88, 107, 126);
  doc.text(label, PAGE.margin, state.cursorY);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(35, 52, 70);
  doc.text(wrapped, PAGE.margin + labelWidth, state.cursorY);

  state.cursorY += blockHeight + 8;
}

function addParagraph(doc, state, text, report) {
  const wrapped = doc.splitTextToSize(formatReportValue(text), PAGE.width - PAGE.margin * 2);
  ensureSpace(doc, state, wrapped.length * 13 + 8, report);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(35, 52, 70);
  doc.text(wrapped, PAGE.margin, state.cursorY);
  state.cursorY += wrapped.length * 13 + 8;
}

function addList(doc, state, title, items, report) {
  addField(doc, state, title, Array.isArray(items) ? items.join(", ") : items, report);
}

function buildSections(report, user) {
  const primary = getPrimaryDiagnosis(report);
  const severity = getSeverityMeta(primary.confidence || report?.confidence);
  const snapshot = report?.profile_snapshot || {};
  const diagnoses = getPossibleDiseases(report);

  return [
    {
      title: "Patient Details",
      rows: [
        ["Patient Name", user?.name],
        ["Email", user?.email],
        ["Age", snapshot?.age],
        ["Gender", snapshot?.gender],
      ],
    },
    {
      title: "Assessment Intake",
      rows: [
        ["Symptoms", report?.symptoms],
        ["Duration", report?.duration],
        ["Existing diseases", snapshot?.existing_diseases],
        ["Current medicines", snapshot?.current_medicines],
        ["Allergies", snapshot?.allergies],
        ["Additional notes", report?.additional_notes],
      ],
    },
    {
      title: "AI Diagnosis Summary",
      rows: [
        ["Primary diagnosis", primary?.name],
        ["Confidence", `${getDisplayConfidence(primary?.confidence || report?.confidence)}%`],
        ["Severity badge", severity.label],
        ["General advice", report?.prediction?.general_advice],
        ["Emergency warning", report?.prediction?.emergency_warning],
      ],
    },
    ...diagnoses.map((diagnosis, index) => ({
      title: `Possible Diagnosis ${index + 1}`,
      rows: [
        ["Condition", diagnosis?.name],
        ["Confidence", `${getDisplayConfidence(diagnosis?.confidence)}%`],
        ["Description", diagnosis?.description],
        ["Possible causes", diagnosis?.possible_causes],
        ["Recommended medicines", diagnosis?.recommended_medicines],
        ["Home remedies", diagnosis?.home_remedies],
        ["Diet", diagnosis?.diet],
        ["Precautions", diagnosis?.precautions],
        ["When to see a doctor", diagnosis?.when_to_see_doctor],
      ],
    })),
    {
      title: "Medical Disclaimer",
      rows: [
        [
          "Disclaimer",
          report?.prediction?.disclaimer ||
            "This AI-generated report is informational only and does not replace professional medical advice, diagnosis, or treatment.",
        ],
      ],
    },
  ];
}

export function createReportPdf(report, user) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const state = { cursorY: PAGE.contentTop, page: 1 };
  const sections = buildSections(report, user);

  drawHeader(doc, report, state.page);

  sections.forEach((section) => {
    addSectionHeading(doc, state, section.title, report);
    section.rows.forEach(([label, value]) => {
      if (label === "Description" || label === "Disclaimer") {
        addField(doc, state, label, value, report);
        return;
      }

      if (Array.isArray(value)) {
        addList(doc, state, label, value, report);
        return;
      }

      addField(doc, state, label, value, report);
    });
    state.cursorY += 6;
  });

  addSectionHeading(doc, state, "Shareable Summary", report);
  addParagraph(doc, state, buildReportSummary(report, user), report);

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    drawFooter(doc, page, totalPages);
  }

  return doc;
}

export function downloadReportPdf(report, user) {
  const doc = createReportPdf(report, user);
  doc.save(createFileName(report));
}

export async function createReportPdfFile(report, user) {
  const doc = createReportPdf(report, user);
  const blob = doc.output("blob");
  return new File([blob], createFileName(report), { type: "application/pdf" });
}
