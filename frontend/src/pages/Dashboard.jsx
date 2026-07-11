import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, ArrowRight, Clock, FileText, MailCheck, ShieldCheck } from "lucide-react";

import AppShell from "@/components/AppShell";
import Disclaimer from "@/components/Disclaimer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";

function getDisplayConfidence(confidence) {
  return confidence > 0 ? confidence : 65;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/reports")
      .then(({ data }) => setReports(data.reports || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const latest = reports[0];
  const total = reports.length;
  const todayCount = reports.filter((report) => {
    const reportDate = new Date(report.created_at);
    const today = new Date();
    return reportDate.toDateString() === today.toDateString();
  }).length;

  return (
    <AppShell>
      <main className="mx-auto max-w-7xl space-y-8 px-6 py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="overline text-muted-foreground" data-testid="dashboard-greeting-eyebrow">
              Your health journal
            </span>
            <h1 className="mt-2 font-serif text-4xl text-primary sm:text-5xl" data-testid="dashboard-title">
              Hello, {user?.name?.split(" ")[0] || "there"}.
            </h1>
            <p className="mt-2 max-w-xl text-muted-foreground">
              Log new symptoms, revisit recent reports, and keep your account security in view.
            </p>
          </div>

          <Link to="/diagnose" data-testid="dashboard-start-cta">
            <Button size="lg" className="rounded-full px-6">
              Start a new diagnosis <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        <Disclaimer />

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            { icon: FileText, label: "Total reports", value: total, id: "stat-total" },
            { icon: Clock, label: "Today", value: todayCount, id: "stat-today" },
            { icon: Activity, label: "Latest condition", value: latest?.top_disease || "-", id: "stat-latest" },
          ].map((stat) => (
            <div key={stat.id} data-testid={stat.id} className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-md bg-secondary">
                  <stat.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="overline text-muted-foreground">{stat.label}</div>
              </div>
              <div className="mt-4 truncate font-serif text-3xl text-primary">{stat.value}</div>
            </div>
          ))}
        </section>

        <section id="profile-security" className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-6 lg:col-span-2">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="overline text-muted-foreground">Profile security</div>
                <h2 className="mt-2 font-serif text-2xl text-primary">
                  Keep your account trusted.
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  Your diagnosis history now uses verified email, refresh sessions, and device-aware
                  session controls.
                </p>
              </div>
              <Badge variant={user?.email_verified ? "secondary" : "outline"} className="w-fit">
                {user?.email_verified ? "Verified" : "Not verified"}
              </Badge>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-border bg-muted/40 p-5">
                <div className="flex items-center gap-2 text-primary">
                  <MailCheck className="h-4 w-4" />
                  <div className="overline">Email status</div>
                </div>
                <div className="mt-3 text-lg font-medium text-primary">{user?.email}</div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {user?.email_verified
                    ? "Your email is verified and ready for secure sign-in."
                    : "Finish verification to protect account recovery and future sign-ins."}
                </p>
                {!user?.email_verified && user?.email ? (
                  <Link to={`/verify-email?email=${encodeURIComponent(user.email)}`} className="mt-4 inline-block">
                    <Button variant="outline" className="rounded-full">
                      Verify email
                    </Button>
                  </Link>
                ) : null}
              </div>

              <div className="rounded-xl border border-border bg-muted/40 p-5">
                <div className="flex items-center gap-2 text-primary">
                  <ShieldCheck className="h-4 w-4" />
                  <div className="overline">Session control</div>
                </div>
                <div className="mt-3 text-lg font-medium text-primary">Manage active devices</div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Review browsers, IP addresses, and recent activity. Sign out devices you no longer
                  trust.
                </p>
                <Link to="/sessions" className="mt-4 inline-block">
                  <Button variant="outline" className="rounded-full">
                    Open session manager
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-xl bg-primary p-6 text-primary-foreground">
            <div>
              <Activity className="h-6 w-6" />
              <h3 className="mt-3 font-serif text-2xl">Not sure what to log?</h3>
              <p className="mt-2 text-sm opacity-80">
                Pick common symptoms like fever, cough, or headache, then add notes in your own words
                when you need extra context.
              </p>
            </div>
            <Link to="/diagnose" className="mt-6" data-testid="dashboard-side-cta">
              <Button variant="secondary" className="w-full rounded-full">
                Open symptom checker
              </Button>
            </Link>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl text-primary">Recent reports</h2>
            <Link
              to="/reports"
              className="text-sm text-primary underline underline-offset-4"
              data-testid="dashboard-see-all-reports"
            >
              See all
            </Link>
          </div>

          {loading ? (
            <div className="mt-6 text-sm text-muted-foreground">Loading...</div>
          ) : reports.length === 0 ? (
            <div className="mt-6 text-sm text-muted-foreground">
              No reports yet. Start with your first diagnosis above.
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {reports.slice(0, 5).map((report) => (
                <li key={report.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <Link
                      to={`/reports/${report.id}`}
                      className="truncate font-medium text-primary hover:underline"
                      data-testid={`dashboard-report-link-${report.id}`}
                    >
                      {report.top_disease}
                    </Link>
                    <div className="truncate text-xs text-muted-foreground">
                      {(report.symptoms || []).slice(0, 4).join(", ")}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-serif text-lg text-primary">{getDisplayConfidence(report.confidence)}%</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(report.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </AppShell>
  );
}
