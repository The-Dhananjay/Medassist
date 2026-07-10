import { useEffect, useState } from "react";
import { Clock3, Laptop2, LogOut, ShieldCheck, Smartphone } from "lucide-react";
import { useNavigate } from "react-router-dom";

import Navbar from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";

function DeviceIcon({ device }) {
  if ((device || "").toLowerCase() === "mobile") {
    return <Smartphone className="h-4 w-4" />;
  }
  return <Laptop2 className="h-4 w-4" />;
}

function formatDateTime(value) {
  if (!value) return "Unknown";
  return new Date(value).toLocaleString();
}

export default function Sessions() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState("");

  const loadSessions = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/auth/sessions");
      setSessions(data.sessions || []);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const signOutCurrent = async () => {
    setBusyKey("current");
    try {
      await api.delete("/auth/sessions/current");
      setUser(null);
      toast.success("Current session signed out");
      navigate("/login");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setBusyKey("");
    }
  };

  const signOutAll = async () => {
    setBusyKey("all");
    try {
      await api.delete("/auth/sessions/all");
      setUser(null);
      toast.success("All sessions signed out");
      navigate("/login");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setBusyKey("");
    }
  };

  const signOutSession = async (sessionId) => {
    setBusyKey(sessionId);
    try {
      const { data } = await api.delete(`/auth/sessions/${sessionId}`);
      if (data.current_session_revoked) {
        setUser(null);
        toast.success("Session signed out");
        navigate("/login");
        return;
      }
      setSessions((current) => current.filter((session) => session.id !== sessionId));
      toast.success("Session signed out");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setBusyKey("");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-5xl space-y-8 px-6 py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="overline text-muted-foreground">Session management</span>
            <h1 className="mt-2 font-serif text-4xl text-primary">Active devices</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Review where your MedAssist account is signed in, then close sessions you no longer trust.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              className="rounded-full"
              disabled={busyKey === "current"}
              onClick={signOutCurrent}
            >
              {busyKey === "current" ? "Signing out..." : "Logout current"}
            </Button>
            <Button
              className="rounded-full"
              disabled={busyKey === "all"}
              onClick={signOutAll}
            >
              {busyKey === "all" ? "Signing out..." : "Logout all devices"}
            </Button>
          </div>
        </div>

        <section className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 text-primary">
            <ShieldCheck className="h-4 w-4" />
            <div className="overline">Security view</div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Each session tracks browser, device type, IP address, last activity, and expiration. If something
            looks unfamiliar, sign it out immediately.
          </p>
        </section>

        <section className="space-y-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="rounded-xl border border-border bg-card p-5">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="mt-3 h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-3/4" />
                <Skeleton className="mt-4 h-10 w-32" />
              </div>
            ))
          ) : sessions.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
              No active sessions found.
            </div>
          ) : (
            sessions.map((session) => (
              <article key={session.id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2 text-primary">
                        <DeviceIcon device={session.device} />
                        <h2 className="font-serif text-2xl">{session.browser || "Unknown browser"}</h2>
                      </div>
                      {session.current ? <Badge variant="secondary">Current session</Badge> : null}
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      {session.device || "Unknown device"} on {session.os || "Unknown OS"}
                    </div>
                  </div>

                  <Button
                    variant={session.current ? "outline" : "ghost"}
                    className="rounded-full"
                    disabled={busyKey === session.id}
                    onClick={() => signOutSession(session.id)}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    {busyKey === session.id ? "Signing out..." : "Sign out"}
                  </Button>
                </div>

                <div className="mt-5 grid gap-4 text-sm text-muted-foreground md:grid-cols-3">
                  <div className="rounded-lg border border-border bg-muted/30 p-4">
                    <div className="overline text-primary">IP address</div>
                    <div className="mt-2 text-foreground">{session.ip_address || "Unknown"}</div>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/30 p-4">
                    <div className="flex items-center gap-2 text-primary">
                      <Clock3 className="h-4 w-4" />
                      <div className="overline">Last active</div>
                    </div>
                    <div className="mt-2 text-foreground">{formatDateTime(session.last_active_at)}</div>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/30 p-4">
                    <div className="overline text-primary">Expires</div>
                    <div className="mt-2 text-foreground">{formatDateTime(session.expires_at)}</div>
                  </div>
                </div>
              </article>
            ))
          )}
        </section>
      </main>
    </div>
  );
}
