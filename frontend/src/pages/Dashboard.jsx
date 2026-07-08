import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Disclaimer from "@/components/Disclaimer";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { ArrowRight, Activity, Clock, FileText, Sparkles } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/reports")
      .then(({ data }) => setReports(data.reports || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const latest = reports[0];
  const total = reports.length;
  const todayCount = reports.filter((r) => {
    const d = new Date(r.created_at);
    const t = new Date();
    return d.toDateString() === t.toDateString();
  }).length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-7xl px-6 py-10 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <span className="overline text-muted-foreground" data-testid="dashboard-greeting-eyebrow">
              — Your health journal
            </span>
            <h1 className="mt-2 font-serif text-4xl sm:text-5xl text-primary" data-testid="dashboard-title">
              Hello, {user?.name?.split(" ")[0] || "there"}.
            </h1>
            <p className="mt-2 text-muted-foreground max-w-xl">
              Log new symptoms or revisit a past report. Take your time — this
              is a quiet space.
            </p>
          </div>
          <Link to="/diagnose" data-testid="dashboard-start-cta">
            <Button size="lg" className="rounded-full px-6">
              Start a new diagnosis <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>

        <Disclaimer />

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: FileText, label: "Total reports", value: total, id: "stat-total" },
            { icon: Clock, label: "Today", value: todayCount, id: "stat-today" },
            { icon: Activity, label: "Latest condition", value: latest?.top_disease || "—", id: "stat-latest" },
          ].map((s) => (
            <div key={s.id} data-testid={s.id} className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-md bg-secondary grid place-items-center">
                  <s.icon className="w-4 h-4 text-primary" />
                </div>
                <div className="overline text-muted-foreground">{s.label}</div>
              </div>
              <div className="mt-4 font-serif text-3xl text-primary truncate">{s.value}</div>
            </div>
          ))}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl text-primary">Recent reports</h2>
              <Link to="/reports" className="text-sm text-primary underline underline-offset-4" data-testid="dashboard-see-all-reports">
                See all
              </Link>
            </div>
            {loading ? (
              <div className="mt-6 text-sm text-muted-foreground">Loading…</div>
            ) : reports.length === 0 ? (
              <div className="mt-6 text-sm text-muted-foreground">
                No reports yet. Start with your first diagnosis above.
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-border">
                {reports.slice(0, 5).map((r) => (
                  <li key={r.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <Link to={`/reports/${r.id}`} className="font-medium text-primary truncate hover:underline" data-testid={`dashboard-report-link-${r.id}`}>
                        {r.top_disease}
                      </Link>
                      <div className="text-xs text-muted-foreground truncate">
                        {(r.symptoms || []).slice(0, 4).join(", ")}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-serif text-lg text-primary">{r.confidence}%</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-primary text-primary-foreground rounded-xl p-6 flex flex-col justify-between">
            <div>
              <Sparkles className="w-6 h-6" />
              <h3 className="mt-3 font-serif text-2xl">Not sure what to log?</h3>
              <p className="mt-2 text-sm opacity-80">
                Pick from common symptoms like fever, cough or headache — or
                describe what you're feeling in your own words.
              </p>
            </div>
            <Link to="/diagnose" className="mt-6" data-testid="dashboard-side-cta">
              <Button variant="secondary" className="rounded-full w-full">
                Open symptom checker
              </Button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
