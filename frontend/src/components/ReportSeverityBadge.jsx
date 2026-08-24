import { cn } from "@/lib/utils";
import { getDisplayConfidence, getSeverityMeta } from "@/lib/reportUtils";

export default function ReportSeverityBadge({
  confidence,
  likelihood,
  compact = false,
  align = "left",
  showConfidence = true,
}) {
  const pct = getDisplayConfidence(confidence);
  const severity = getSeverityMeta(pct, likelihood);

  return (
    <div
      className={cn(
        "flex gap-2",
        compact ? "flex-wrap items-center" : "flex-col",
        align === "right" ? "items-end text-right" : "items-start"
      )}
    >
      <span
        className={cn(
          "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold shadow-xs",
          severity.className
        )}
      >
        {severity.label}
      </span>
      {showConfidence ? (
        <div className={cn("text-xs text-muted-foreground font-medium", compact && "text-xs")}>
          AI assessment confidence: <span className="font-semibold text-foreground">{pct}%</span>
        </div>
      ) : null}
    </div>
  );
}
