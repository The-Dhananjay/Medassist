import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, BadgeCheck, CalendarDays, FileText, Settings2, ShieldCheck, UserRound } from "lucide-react";

import AppShell from "@/components/AppShell";
import EmptyState from "@/components/EmptyState";
import ReportSeverityBadge from "@/components/ReportSeverityBadge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/context/AuthContext";
import api, { formatApiError } from "@/lib/api";
import { formatReportDate, formatReportDateTime, getDisplayConfidence } from "@/lib/reportUtils";

function getInitials(name) {
  return (name || "MedAssist")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

export default function Profile() {
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reports, setReports] = useState([]);
  const [form, setForm] = useState({
    name: "",
    age: "",
    gender: "",
    medical_history: "",
    allergies: "",
    current_medicines: "",
  });

  useEffect(() => {
    if (!user) return;

    setForm({
      name: user.name || "",
      age: user.age || "",
      gender: user.gender || "",
      medical_history: user.medical_history || "",
      allergies: user.allergies || "",
      current_medicines: user.current_medicines || "",
    });
  }, [user]);

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      try {
        const [{ data: profileData }, { data: reportsData }] = await Promise.all([
          api.get("/profile"),
          api.get("/reports"),
        ]);
        setUser(profileData.user);
        setReports(reportsData.reports || []);
      } catch (err) {
        toast.error(formatApiError(err));
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [setUser]);

  const latestReport = reports[0];
  const joinedDate = useMemo(() => formatReportDate(user?.created_at), [user?.created_at]);
  const lastLogin = useMemo(() => formatReportDateTime(user?.last_login_at), [user?.last_login_at]);

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const saveProfile = async () => {
    setSaving(true);
    try {
      const payload = {
        name: form.name || null,
        age: form.age ? Number(form.age) : null,
        gender: form.gender || null,
        medical_history: form.medical_history || null,
        allergies: form.allergies || null,
        current_medicines: form.current_medicines || null,
      };

      const { data } = await api.put("/profile", payload);
      setUser(data.user);
      toast.success("Profile updated.");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <main className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="overline text-muted-foreground">Account overview</span>
            <h1 className="mt-2 font-serif text-3xl text-primary sm:text-4xl">Your profile</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Review your MedAssist identity, health context, and account activity in one place.
            </p>
          </div>
          <Link to="/settings" className="block w-full sm:w-auto">
            <Button variant="outline" className="min-h-[44px] w-full rounded-full sm:w-auto">
              <Settings2 className="mr-2 h-4 w-4" /> Open settings
            </Button>
          </Link>
        </div>

        {loading ? (
          <section className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
            <div className="rounded-xl border border-border bg-card p-6">
              <Skeleton className="h-10 w-40" />
              <Skeleton className="mt-4 h-28 w-full" />
              <Skeleton className="mt-4 h-24 w-full" />
            </div>
            <div className="rounded-xl border border-border bg-card p-6">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="mt-4 h-40 w-full" />
            </div>
          </section>
        ) : (
          <>
            <section className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
              <div className="overflow-hidden rounded-2xl bg-primary text-primary-foreground shadow-sm">
                <div className="grid justify-items-center gap-6 p-6 text-center sm:grid-cols-[auto,1fr] sm:justify-items-stretch sm:p-8 sm:text-left">
                  <Avatar className="h-24 w-24 border border-white/20">
                    <AvatarFallback className="bg-white/15 text-2xl font-semibold text-white">
                      {getInitials(user?.name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                      <h2 className="font-serif text-3xl">{user?.name || "MedAssist user"}</h2>
                      <Badge variant="secondary" className="bg-white/15 text-white hover:bg-white/15">
                        {user?.email_verified ? "Verified" : "Pending verification"}
                      </Badge>
                    </div>
                    <div className="text-sm text-primary-foreground/80">{user?.email}</div>
                    <div className="grid gap-4 text-sm text-primary-foreground/85 sm:grid-cols-2">
                      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <div className="overline text-white/70">Joined date</div>
                        <div className="mt-2 text-lg font-medium">{joinedDate}</div>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <div className="overline text-white/70">Last login</div>
                        <div className="mt-2 text-lg font-medium">{lastLogin}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-6">
                <div className="flex items-center gap-2 text-primary">
                  <ShieldCheck className="h-4 w-4" />
                  <div className="overline">Account status</div>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-border bg-muted/40 p-4">
                    <div className="text-sm text-muted-foreground">Reports generated</div>
                    <div className="mt-2 font-serif text-3xl text-primary">{reports.length}</div>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/40 p-4">
                    <div className="text-sm text-muted-foreground">Account state</div>
                    <div className="mt-2 text-lg font-medium text-primary">
                      {user?.email_verified ? "Active and verified" : "Needs verification"}
                    </div>
                  </div>
                </div>

                {latestReport ? (
                  <div className="mt-5 rounded-xl border border-border bg-muted/30 p-4">
                    <div className="flex items-center gap-2 text-primary">
                      <Activity className="h-4 w-4" />
                      <div className="overline">Latest diagnosis</div>
                    </div>
                    <div className="mt-3 font-serif text-2xl text-primary">{latestReport.top_disease}</div>
                    <div className="mt-3 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <ReportSeverityBadge confidence={latestReport.confidence} compact />
                      <div className="text-sm text-muted-foreground">
                        {formatReportDateTime(latestReport.created_at)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    icon={FileText}
                    title="No diagnosis history yet"
                    description="Once you run a diagnosis, your latest report and confidence details will appear here."
                    actionLabel="Start diagnosis"
                    actionTo="/diagnose"
                    className="mt-5 p-6"
                  />
                )}
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[1fr,0.9fr]">
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="flex items-center gap-2 text-primary">
                  <UserRound className="h-4 w-4" />
                  <div className="overline">Health profile</div>
                </div>
                <h2 className="mt-3 font-serif text-2xl text-primary">Keep your context up to date</h2>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  These details help MedAssist personalize future diagnosis context without changing your
                  existing authentication flow.
                </p>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="profile-name">Full name</Label>
                    <Input
                      id="profile-name"
                      className="mt-1"
                      value={form.name}
                      onChange={(event) => setField("name", event.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="profile-age">Age</Label>
                    <Input
                      id="profile-age"
                      type="number"
                      className="mt-1"
                      value={form.age}
                      onChange={(event) => setField("age", event.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="profile-gender">Gender</Label>
                    <Input
                      id="profile-gender"
                      className="mt-1"
                      value={form.gender}
                      onChange={(event) => setField("gender", event.target.value)}
                      placeholder="e.g. female"
                    />
                  </div>
                  <div className="rounded-xl border border-border bg-muted/30 p-4">
                    <div className="flex items-center gap-2 text-primary">
                      <BadgeCheck className="h-4 w-4" />
                      <div className="overline">Verification</div>
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      {user?.email_verified
                        ? "Your email is verified and your account recovery is fully enabled."
                        : "Verify your email to strengthen recovery and session security."}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="profile-history">Existing diseases</Label>
                    <Textarea
                      id="profile-history"
                      className="mt-1"
                      rows={3}
                      value={form.medical_history}
                      onChange={(event) => setField("medical_history", event.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="profile-allergies">Allergies</Label>
                    <Textarea
                      id="profile-allergies"
                      className="mt-1"
                      rows={3}
                      value={form.allergies}
                      onChange={(event) => setField("allergies", event.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="profile-medicines">Current medicines</Label>
                    <Textarea
                      id="profile-medicines"
                      className="mt-1"
                      rows={3}
                      value={form.current_medicines}
                      onChange={(event) => setField("current_medicines", event.target.value)}
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <Button className="min-h-[44px] w-full rounded-full px-6 sm:w-auto" onClick={saveProfile} disabled={saving}>
                    {saving ? "Saving profile..." : "Save profile"}
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-6">
                <div className="flex items-center gap-2 text-primary">
                  <CalendarDays className="h-4 w-4" />
                  <div className="overline">Recent activity</div>
                </div>
                <h2 className="mt-3 font-serif text-2xl text-primary">A quick medical snapshot</h2>
                {reports.length === 0 ? (
                  <EmptyState
                    icon={Activity}
                    title="No recent activity"
                    description="Run your first diagnosis to start building a reusable report history."
                    actionLabel="Start diagnosis"
                    actionTo="/diagnose"
                    className="mt-5 p-6"
                  />
                ) : (
                  <ul className="mt-5 divide-y divide-border">
                    {reports.slice(0, 4).map((report) => (
                      <li key={report.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="break-words font-medium text-primary sm:truncate">{report.top_disease}</div>
                          <div className="break-words text-xs text-muted-foreground sm:truncate">
                            {(report.symptoms || []).slice(0, 4).join(", ")}
                          </div>
                        </div>
                        <div className="shrink-0 text-left sm:text-right">
                          <div className="font-serif text-lg text-primary">
                            {getDisplayConfidence(report.confidence)}%
                          </div>
                          <div className="text-xs text-muted-foreground">{formatReportDate(report.created_at)}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </AppShell>
  );
}
