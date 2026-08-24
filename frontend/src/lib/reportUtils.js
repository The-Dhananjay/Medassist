export function getDisplayConfidence(confidence, fallback = 65) {
  const value = Number(confidence);
  return Number.isFinite(value) && value > 0 ? Math.round(value) : fallback;
}

export function getSeverityMeta(confidence, likelihoodKey) {
  if (likelihoodKey) {
    const key = String(likelihoodKey).toLowerCase();
    if (key === "higher") {
      return {
        label: "Higher likelihood",
        slug: "higher",
        className: "border-primary/30 bg-primary/10 text-primary font-semibold",
      };
    }
    if (key === "moderate") {
      return {
        label: "Moderate likelihood",
        slug: "moderate",
        className: "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold",
      };
    }
    if (key === "lower") {
      return {
        label: "Lower likelihood",
        slug: "lower",
        className: "border-slate-500/30 bg-slate-500/15 text-slate-700 dark:text-slate-300 font-semibold",
      };
    }
    if (key === "rule_out") {
      return {
        label: "Important to rule out",
        slug: "rule_out",
        className: "border-red-500/30 bg-red-500/15 text-red-700 dark:text-red-300 font-semibold",
      };
    }
  }

  const pct = getDisplayConfidence(confidence);
  if (pct >= 75) {
    return {
      label: "Higher likelihood",
      slug: "higher",
      className: "border-primary/30 bg-primary/10 text-primary font-semibold",
    };
  }
  if (pct >= 60) {
    return {
      label: "Moderate likelihood",
      slug: "moderate",
      className: "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold",
    };
  }
  return {
    label: "Lower likelihood",
    slug: "lower",
    className: "border-slate-500/30 bg-slate-500/15 text-slate-700 dark:text-slate-300 font-semibold",
  };
}

export function formatReportValue(value, fallback = "Not provided") {
  if (Array.isArray(value)) {
    const filtered = value.map((item) => String(item || "").trim()).filter(Boolean);
    return filtered.length > 0 ? filtered.join(", ") : fallback;
  }

  if (value === null || value === undefined) return fallback;

  const normalized = String(value).trim();
  return normalized ? normalized : fallback;
}

export function formatReportDate(value) {
  if (!value) return "Unknown";
  return new Date(value).toLocaleDateString();
}

export function formatReportDateTime(value) {
  if (!value) return "Unknown";
  return new Date(value).toLocaleString();
}

export function getPossibleDiseases(report) {
  return Array.isArray(report?.prediction?.possible_diseases)
    ? report.prediction.possible_diseases
    : [];
}

export function getPrimaryDiagnosis(report) {
  const diseases = getPossibleDiseases(report);
  if (diseases.length > 0) return diseases[0];
  return {
    name: report?.top_disease || "Unknown",
    confidence: report?.confidence || 0,
    description: "",
    possible_causes: [],
    recommended_medicines: [],
    home_remedies: [],
    diet: [],
    precautions: [],
    when_to_see_doctor: [],
  };
}

export function getReportShareTitle(report) {
  return `MedAssist Report - ${report?.top_disease || "Diagnosis"}`;
}

export function buildReportSummary(report, user) {
  const primary = getPrimaryDiagnosis(report);
  const severity = getSeverityMeta(primary.confidence || report?.confidence, primary.likelihood);
  const profile = report?.profile_snapshot || {};

  return [
    "MedAssist Diagnostic Summary",
    `Report ID: ${report?.id || "Unknown"}`,
    `Date: ${formatReportDateTime(report?.created_at)}`,
    `Patient: ${formatReportValue(user?.name, "Patient")}`,
    `Email: ${formatReportValue(user?.email)}`,
    `Symptoms: ${formatReportValue(report?.symptoms)}`,
    `Duration: ${formatReportValue(report?.duration)}`,
    `Existing diseases: ${formatReportValue(profile?.existing_diseases)}`,
    `Current medicines: ${formatReportValue(profile?.current_medicines)}`,
    `Allergies: ${formatReportValue(profile?.allergies)}`,
    `Primary diagnosis: ${formatReportValue(primary?.name)}`,
    `Likelihood: ${severity.label}`,
    `AI Assessment Confidence: ${getDisplayConfidence(primary?.confidence || report?.confidence)}%`,
    `Possible causes: ${formatReportValue(primary?.possible_causes)}`,
    `Home remedies: ${formatReportValue(primary?.home_remedies)}`,
    `Diet: ${formatReportValue(primary?.diet)}`,
    `Precautions: ${formatReportValue(primary?.precautions)}`,
    `Emergency warning: ${formatReportValue(report?.prediction?.emergency_warning)}`,
    `General advice: ${formatReportValue(report?.prediction?.general_advice)}`,
    "",
    "Medical disclaimer: This AI-generated report is informational only and is not a substitute for professional medical advice.",
  ].join("\n");
}
