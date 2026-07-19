import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, Apple, ArrowLeft, Home as HomeIcon, ListChecks, Pill, ShieldAlert, Stethoscope, Trash2, UserRound } from "lucide-react";
import { motion } from "framer-motion";

import AppShell from "@/components/AppShell";
import Disclaimer from "@/components/Disclaimer";
import EmptyState from "@/components/EmptyState";
import ReportActionBar from "@/components/ReportActionBar";
import ReportSeverityBadge from "@/components/ReportSeverityBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import api, { formatApiError } from "@/lib/api";
import { formatReportDateTime, formatReportValue, getDisplayConfidence } from "@/lib/reportUtils";
import { toast } from "sonner";
import LoadingBoostAnimation from "@/components/animations/LoadingBoostAnimation";

const detailsContainerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const detailsItemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" },
  },
};


function ConfidenceBar({ value }) {
  const pct = Math.max(0, Math.min(100, getDisplayConfidence(value)));
  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="overline">Confidence</span>
        <span className="font-serif text-lg text-primary">{pct}%</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.15 }}
        />
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, items }) {
  if (!items || (Array.isArray(items) && items.length === 0)) return null;
  const list = Array.isArray(items) ? items : [items];

  return (
    <motion.div
      variants={detailsItemVariants}
      className="rounded-xl border border-border bg-muted/20 p-4 transition-transform duration-200 hover:-translate-y-0.5"
    >
      <div className="flex items-center gap-2 text-primary">
        <Icon className="h-4 w-4" />
        <div className="overline">{title}</div>
      </div>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-foreground/90">
        {list.map((item, index) => (
          <li key={`${title}-${index}`}>{item}</li>
        ))}
      </ul>
    </motion.div>
  );
}

export default function ReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const minimumLoader = new Promise((resolve) => window.setTimeout(resolve, 1500));

    Promise.all([
      api.get(`/reports/${id}`),
      minimumLoader,
    ])
      .then(([{ data }]) => {
        if (active) setReport(data.report);
      })
      .catch((err) => {
        if (active) toast.error(formatApiError(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  const del = async () => {
    if (!confirm("Delete this report? This cannot be undone.")) return;
    try {
      await api.delete(`/reports/${id}`);
      toast.success("Report deleted.");
      navigate("/reports");
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  if (loading) {
    return (
      <AppShell>
        <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
          <LoadingBoostAnimation message="Generating report..." />
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-14 w-2/3" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-48 w-full" />
        </main>
      </AppShell>
    );
  }

  if (!report) {
    return (
      <AppShell>
        <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
          <EmptyState
            icon={AlertTriangle}
            title="Report not found"
            description="This diagnosis may have been deleted or you may not have permission to view it."
            actionLabel="Back to reports"
            actionTo="/reports"
          />
        </main>
      </AppShell>
    );
  }

  const prediction = report.prediction || {};
  const diseases = prediction.possible_diseases || [];
  const emergency = prediction.emergency_warning;
  const snapshot = report.profile_snapshot || {};

  return (
    <AppShell>
      <main className="mx-auto max-w-5xl space-y-8 px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            to="/reports"
            className="flex items-center gap-1 text-sm text-muted-foreground transition-colors duration-150 hover:text-primary"
            data-testid="back-to-reports"
          >
            <ArrowLeft className="h-4 w-4" /> All reports
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={del}
            data-testid="delete-report-button"
            className="min-h-[44px] w-full text-destructive hover:text-destructive sm:w-auto"
          >
            <Trash2 className="mr-1 h-4 w-4" /> Delete
          </Button>
        </div>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <span className="overline text-muted-foreground">
                Report · {formatReportDateTime(report.created_at)}
              </span>
              <h1 className="mt-2 break-words font-serif text-3xl text-primary sm:text-5xl" data-testid="report-title">
                {report.top_disease}
              </h1>
              <div className="mt-3 break-words text-sm text-muted-foreground">
                <span className="overline mr-2">Symptoms</span>
                {(report.symptoms || []).join(", ")}
              </div>
            </div>

            <div className="w-full space-y-4 lg:min-w-[230px] lg:max-w-[280px]">
              <ReportSeverityBadge confidence={report.confidence} align="right" />
              <ReportActionBar report={report} user={user} />
            </div>
          </div>
        </section>

        {emergency ? (
          <div className="flex gap-3 rounded-xl border-2 border-destructive bg-destructive/5 p-5" data-testid="emergency-warning">
            <AlertTriangle className="h-6 w-6 shrink-0 text-destructive" />
            <div>
              <div className="font-serif text-lg text-destructive">Possible emergency</div>
              <p className="mt-1 text-sm text-foreground/90">{emergency}</p>
            </div>
          </div>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="overline text-primary">General advice</div>
            <p className="mt-3 text-sm leading-relaxed text-foreground/90">
              {prediction.general_advice || "No general advice was returned for this report."}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 text-primary">
              <UserRound className="h-4 w-4" />
              <div className="overline">Patient snapshot</div>
            </div>
            <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
              <div><span className="font-medium text-primary">Age:</span> {formatReportValue(snapshot.age)}</div>
              <div><span className="font-medium text-primary">Gender:</span> {formatReportValue(snapshot.gender)}</div>
              <div><span className="font-medium text-primary">Duration:</span> {formatReportValue(report.duration)}</div>
              <div><span className="font-medium text-primary">Existing diseases:</span> {formatReportValue(snapshot.existing_diseases)}</div>
              <div><span className="font-medium text-primary">Current medicines:</span> {formatReportValue(snapshot.current_medicines)}</div>
              <div><span className="font-medium text-primary">Allergies:</span> {formatReportValue(snapshot.allergies)}</div>
            </div>
          </div>
        </section>

        {diseases.length === 0 ? (
          <EmptyState
            icon={Stethoscope}
            title="No diagnosis details available"
            description="This report was generated without detailed disease cards. Try running a fresh diagnosis if you need a newer assessment."
            actionLabel="Start diagnosis"
            actionTo="/diagnose"
          />
        ) : (
          <div className="space-y-6" data-testid="diseases-list">
            {diseases.map((disease, index) => (
              <motion.article
                key={`${disease.name}-${index}`}
                data-testid={`disease-card-${index}`}
                className="rounded-xl border border-border bg-card p-6 shadow-sm transition-transform duration-200 hover:-translate-y-0.5"
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.38, delay: index * 0.06, ease: "easeOut" }}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 max-w-2xl">
                    <div className="overline text-muted-foreground">Possibility #{index + 1}</div>
                    <h2 className="break-words font-serif text-3xl text-primary" data-testid={`disease-name-${index}`}>
                      {disease.name}
                    </h2>
                    <p className="mt-2 break-words text-sm text-muted-foreground">{disease.description}</p>
                  </div>
                  <div className="w-full space-y-3 sm:min-w-[210px] sm:max-w-[260px]">
                    <ConfidenceBar value={disease.confidence} />
                    <ReportSeverityBadge confidence={disease.confidence} compact align="right" />
                  </div>
                </div>

                <motion.div
                  variants={detailsContainerVariants}
                  initial="hidden"
                  animate="show"
                  className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2"
                >
                  <Section icon={ListChecks} title="Possible causes" items={disease.possible_causes} />
                  <Section icon={Pill} title="Recommended medicines" items={disease.recommended_medicines} />
                  <Section icon={HomeIcon} title="Home remedies" items={disease.home_remedies} />
                  <Section icon={Apple} title="Diet" items={disease.diet} />
                  <Section icon={ShieldAlert} title="Precautions" items={disease.precautions} />
                  <Section icon={Stethoscope} title="When to see a doctor" items={disease.when_to_see_doctor} />
                </motion.div>
              </motion.article>
            ))}
          </div>
        )}

        <Disclaimer />
      </main>
    </AppShell>
  );
}
