import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Disclaimer from "@/components/Disclaimer";
import { Button } from "@/components/ui/button";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, Trash2, Stethoscope, Home as HomeIcon, Apple, ShieldAlert, Pill, ListChecks } from "lucide-react";

function ConfidenceBar({ value }) {
  const pct = Math.max(0, Math.min(100, value || 0));
  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="overline">Confidence</span>
        <span className="font-serif text-lg text-primary">{pct}%</span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-primary transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, items }) {
  if (!items || (Array.isArray(items) && items.length === 0)) return null;
  const list = Array.isArray(items) ? items : [items];
  return (
    <div>
      <div className="flex items-center gap-2 text-primary">
        <Icon className="w-4 h-4" />
        <div className="overline">{title}</div>
      </div>
      <ul className="mt-2 space-y-1 text-sm text-foreground/90 list-disc pl-5">
        {list.map((t, i) => <li key={i}>{t}</li>)}
      </ul>
    </div>
  );
}

export default function ReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/reports/${id}`)
      .then(({ data }) => setReport(data.report))
      .catch((err) => toast.error(formatApiError(err)))
      .finally(() => setLoading(false));
  }, [id]);

  const del = async () => {
    if (!confirm("Delete this report? This cannot be undone.")) return;
    try {
      await api.delete(`/reports/${id}`);
      toast.success("Report deleted");
      navigate("/reports");
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-4xl px-6 py-10 text-muted-foreground">Loading report…</div>
    </div>
  );

  if (!report) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-4xl px-6 py-10">
        <p className="text-muted-foreground">Report not found.</p>
        <Link to="/reports"><Button variant="link">Back to reports</Button></Link>
      </div>
    </div>
  );

  const pred = report.prediction || {};
  const diseases = pred.possible_diseases || [];
  const emergency = pred.emergency_warning;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-4xl px-6 py-10 space-y-8">
        <div className="flex items-center justify-between gap-4">
          <Link to="/reports" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1" data-testid="back-to-reports">
            <ArrowLeft className="w-4 h-4" /> All reports
          </Link>
          <Button variant="ghost" size="sm" onClick={del} data-testid="delete-report-button" className="text-destructive hover:text-destructive">
            <Trash2 className="w-4 h-4 mr-1" /> Delete
          </Button>
        </div>

        <div>
          <span className="overline text-muted-foreground">
            Report · {new Date(report.created_at).toLocaleString()}
          </span>
          <h1 className="mt-2 font-serif text-4xl sm:text-5xl text-primary" data-testid="report-title">
            {report.top_disease}
          </h1>
          <div className="mt-3 text-sm text-muted-foreground">
            <span className="overline mr-2">Symptoms</span>
            {(report.symptoms || []).join(", ")}
          </div>
        </div>

        {emergency && (
          <div className="border-2 border-destructive bg-destructive/5 rounded-xl p-5 flex gap-3" data-testid="emergency-warning">
            <AlertTriangle className="w-6 h-6 text-destructive shrink-0" />
            <div>
              <div className="font-serif text-lg text-destructive">Possible emergency</div>
              <p className="text-sm text-foreground/90 mt-1">{emergency}</p>
            </div>
          </div>
        )}

        {pred.general_advice && (
          <div className="bg-secondary/60 border border-border rounded-xl p-5">
            <div className="overline text-primary">General advice</div>
            <p className="mt-2 text-sm text-foreground/90">{pred.general_advice}</p>
          </div>
        )}

        <div className="space-y-6" data-testid="diseases-list">
          {diseases.map((d, idx) => (
            <article
              key={idx}
              data-testid={`disease-card-${idx}`}
              className="bg-card border border-border rounded-xl p-6 animate-fade-up"
              style={{ animationDelay: `${idx * 80}ms` }}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="overline text-muted-foreground">Possibility #{idx + 1}</div>
                  <h2 className="font-serif text-3xl text-primary" data-testid={`disease-name-${idx}`}>
                    {d.name}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground max-w-2xl">{d.description}</p>
                </div>
                <div className="min-w-[180px]">
                  <ConfidenceBar value={d.confidence} />
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <Section icon={ListChecks} title="Possible causes" items={d.possible_causes} />
                <Section icon={Pill} title="OTC medicines" items={d.recommended_medicines} />
                <Section icon={HomeIcon} title="Home remedies" items={d.home_remedies} />
                <Section icon={Apple} title="Diet" items={d.diet} />
                <Section icon={ShieldAlert} title="Precautions" items={d.precautions} />
                <Section icon={Stethoscope} title="When to see a doctor" items={d.when_to_see_doctor} />
              </div>
            </article>
          ))}
        </div>

        <Disclaimer />
      </main>
    </div>
  );
}
