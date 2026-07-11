import { cn } from "@/lib/utils";
import { getDisplayConfidence, getSeverityMeta } from "@/lib/reportUtils";

export default function ReportSeverityBadge({
  confidence,
  compact = false,
  align = "left",
  showConfidence = true,
}) {
  const pct = getDisplayConfidence(confidence);
  const severity = getSeverityMeta(pct);

  return (
    <div
      className={cn(
        "flex gap-2",
        compact ? "flex-wrap items-center" : "flex-col",
        align === "right" ? "items-end text-right" : "items-start"
      )}
    >
      {showConfidence ? (
        <div className={cn("font-serif text-lg text-primary", compact && "text-base")}>
          Confidence {pct}%
        </div>
      ) : null}
      <span
        className={cn(
          "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
          severity.className
        )}
      >
        {severity.label}
      </span>
    </div>
  );
}
