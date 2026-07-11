import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, Globe2, LogOut, MailCheck, Monitor, MoonStar, ShieldAlert, SunMedium, Trash2 } from "lucide-react";
import { useTheme } from "next-themes";

import AppShell from "@/components/AppShell";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/context/AuthContext";
import api, { formatApiError } from "@/lib/api";
import { defaultPreferences, loadPreferences, savePreferences } from "@/lib/preferences";

export default function Settings() {
  const navigate = useNavigate();
  const { setTheme, theme = "light" } = useTheme();
  const { setUser } = useAuth();
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [busy, setBusy] = useState("");

  const selectedTheme = theme || "light";
  const ThemeIcon =
    selectedTheme === "dark" ? MoonStar : selectedTheme === "system" ? Monitor : SunMedium;

  useEffect(() => {
    setPreferences(loadPreferences());
  }, []);

  useEffect(() => {
    savePreferences(preferences);
  }, [preferences]);

  const setPreference = (key, value) =>
    setPreferences((current) => ({
      ...current,
      [key]: value,
    }));

  const logoutEverywhere = async () => {
    setBusy("logout-all");
    try {
      await api.delete("/auth/sessions/all");
      localStorage.removeItem("token");
      setUser(null);
      toast.success("All devices signed out.");
      navigate("/login");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setBusy("");
    }
  };

  return (
    <AppShell>
      <main className="mx-auto max-w-5xl space-y-8 px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="overline text-muted-foreground">Account settings</span>
            <h1 className="mt-2 font-serif text-3xl text-primary sm:text-4xl">Preferences and security</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Personalize the MedAssist experience, choose a theme, and manage your account security.
            </p>
          </div>
          <Link to="/profile" className="block w-full sm:w-auto">
            <Button variant="outline" className="min-h-[44px] w-full rounded-full sm:w-auto">Back to profile</Button>
          </Link>
        </div>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 text-primary">
              <MoonStar className="h-4 w-4" />
              <div className="overline">Appearance</div>
            </div>
            <h2 className="mt-3 font-serif text-2xl text-primary">Theme</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Keep MedAssist aligned with your device or switch between light and dark mode manually.
            </p>

            <div className="mt-5 flex items-start gap-3 sm:items-center">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-primary">
                <ThemeIcon className="h-4 w-4" />
              </div>
              <Select value={selectedTheme} onValueChange={setTheme}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 text-primary">
              <Globe2 className="h-4 w-4" />
              <div className="overline">Language</div>
            </div>
            <h2 className="mt-3 font-serif text-2xl text-primary">Regional preference</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Save your preferred language for future MedAssist enhancements and communication choices.
            </p>

            <div className="mt-5">
              <Select
                value={preferences.language}
                onValueChange={(value) => setPreference("language", value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="english">English</SelectItem>
                  <SelectItem value="hindi">Hindi</SelectItem>
                  <SelectItem value="system">Follow browser preference</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 text-primary">
              <Bell className="h-4 w-4" />
              <div className="overline">Notifications</div>
            </div>
            <h2 className="mt-3 font-serif text-2xl text-primary">Stay informed</h2>
            <div className="mt-5 space-y-4">
              <div className="flex flex-col gap-4 rounded-xl border border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-medium text-primary">Product notifications</div>
                  <div className="text-sm text-muted-foreground">
                    Receive interface hints and important account reminders.
                  </div>
                </div>
                <Switch
                  checked={preferences.notifications}
                  onCheckedChange={(value) => setPreference("notifications", value)}
                />
              </div>
              <div className="flex flex-col gap-4 rounded-xl border border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-medium text-primary">Email report updates</div>
                  <div className="text-sm text-muted-foreground">
                    Save your preference for future report-delivery features.
                  </div>
                </div>
                <Switch
                  checked={preferences.emailReports}
                  onCheckedChange={(value) => setPreference("emailReports", value)}
                />
              </div>
              <div className="flex flex-col gap-4 rounded-xl border border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-medium text-primary">Security emails</div>
                  <div className="text-sm text-muted-foreground">
                    Keep email notices enabled for sessions, sign-ins, and recovery events.
                  </div>
                </div>
                <Switch
                  checked={preferences.emailSecurity}
                  onCheckedChange={(value) => setPreference("emailSecurity", value)}
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 text-primary">
              <MailCheck className="h-4 w-4" />
              <div className="overline">Security</div>
            </div>
            <h2 className="mt-3 font-serif text-2xl text-primary">Sensitive account actions</h2>
            <div className="mt-5 space-y-4">
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="font-medium text-primary">Change password</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Use the existing recovery flow to rotate your password safely.
                </div>
                <Link to="/forgot-password" className="mt-4 inline-block w-full sm:w-auto">
                  <Button variant="outline" className="min-h-[44px] w-full rounded-full sm:w-auto">Open password recovery</Button>
                </Link>
              </div>

              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="font-medium text-primary">Logout all devices</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Sign out every active browser and session tied to this account.
                </div>
                <Button
                  className="mt-4 min-h-[44px] w-full rounded-full sm:w-auto"
                  onClick={logoutEverywhere}
                  disabled={busy === "logout-all"}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {busy === "logout-all" ? "Signing out..." : "Logout all devices"}
                </Button>
              </div>

              <div className="rounded-xl border border-destructive/25 bg-destructive/5 p-4">
                <div className="flex items-center gap-2 text-destructive">
                  <ShieldAlert className="h-4 w-4" />
                  <div className="font-medium">Delete account</div>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  Account deletion is intentionally restricted in this deployment until a dedicated backend
                  deletion endpoint is enabled.
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="mt-4 min-h-[44px] w-full rounded-full sm:w-auto">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Review delete account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete account</AlertDialogTitle>
                      <AlertDialogDescription>
                        This UI keeps the destructive flow visible, but the backend does not yet expose a safe
                        delete-account API. Enabling it should happen on the server before this action is made live.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Close</AlertDialogCancel>
                      <AlertDialogAction disabled>Backend required</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        </section>
      </main>
    </AppShell>
  );
}
