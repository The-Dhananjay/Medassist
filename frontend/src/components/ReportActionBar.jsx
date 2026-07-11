import { useState } from "react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { Copy, Download, Loader2, Mail, MessageCircleMore } from "lucide-react";

import { createReportPdfFile, downloadReportPdf } from "@/lib/reportPdf";
import { buildReportSummary, getReportShareTitle } from "@/lib/reportUtils";
import { cn } from "@/lib/utils";

export default function ReportActionBar({ report, user, compact = false, className }) {
  const [busyAction, setBusyAction] = useState("");

  const shareSummary = buildReportSummary(report, user);
  const shareTitle = getReportShareTitle(report);

  const withBusy = async (action, fn) => {
    try {
      setBusyAction(action);
      await fn();
    } catch (err) {
      toast.error(err?.message || "We could not complete that report action.");
    } finally {
      setBusyAction("");
    }
  };

  const handleDownload = () =>
    withBusy("download", async () => {
      downloadReportPdf(report, user);
      toast.success("PDF report downloaded.");
    });

  const handleCopy = () =>
    withBusy("copy", async () => {
      await navigator.clipboard.writeText(shareSummary);
      toast.success("Report summary copied.");
    });

  const shareWithFallback = async (channel) => {
    const file = await createReportPdfFile(report, user);
    const shareSupported =
      typeof navigator !== "undefined" &&
      typeof navigator.canShare === "function" &&
      navigator.canShare({ files: [file] }) &&
      typeof navigator.share === "function";

    if (shareSupported) {
      await navigator.share({
        title: shareTitle,
        text: shareSummary,
        files: [file],
      });
      toast.success("Share sheet opened with the report PDF.");
      return;
    }

    downloadReportPdf(report, user);

    if (channel === "email") {
      window.location.href = `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(
        `${shareSummary}\n\nThe MedAssist PDF report has been downloaded on this device.`
      )}`;
      toast.success("PDF downloaded and email draft opened.");
      return;
    }

    window.open(
      `https://wa.me/?text=${encodeURIComponent(
        `${shareSummary}\n\nThe MedAssist PDF report has been downloaded on this device.`
      )}`,
      "_blank",
      "noopener,noreferrer"
    );
    toast.success("PDF downloaded and WhatsApp share opened.");
  };

  return (
    <div
      className={cn(
        compact ? "flex flex-wrap gap-2" : "flex flex-col gap-2 sm:flex-row sm:flex-wrap",
        className
      )}
    >
      <Button
        variant={compact ? "ghost" : "outline"}
        size={compact ? "sm" : "default"}
        className={cn(!compact && "min-h-[44px] w-full rounded-full sm:w-auto")}
        onClick={handleDownload}
        disabled={busyAction !== ""}
      >
        {busyAction === "download" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        {!compact ? "Download PDF" : null}
      </Button>
      <Button
        variant="ghost"
        size={compact ? "sm" : "default"}
        className={cn(!compact && "min-h-[44px] w-full rounded-full sm:w-auto")}
        onClick={() => withBusy("email", () => shareWithFallback("email"))}
        disabled={busyAction !== ""}
      >
        {busyAction === "email" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
        {!compact ? "Share by Email" : null}
      </Button>
      <Button
        variant="ghost"
        size={compact ? "sm" : "default"}
        className={cn(!compact && "min-h-[44px] w-full rounded-full sm:w-auto")}
        onClick={() => withBusy("whatsapp", () => shareWithFallback("whatsapp"))}
        disabled={busyAction !== ""}
      >
        {busyAction === "whatsapp" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <MessageCircleMore className="h-4 w-4" />
        )}
        {!compact ? "Share on WhatsApp" : null}
      </Button>
      <Button
        variant="ghost"
        size={compact ? "sm" : "default"}
        className={cn(!compact && "min-h-[44px] w-full rounded-full sm:w-auto")}
        onClick={handleCopy}
        disabled={busyAction !== ""}
      >
        {busyAction === "copy" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
        {!compact ? "Copy Summary" : null}
      </Button>
    </div>
  );
}
