import { useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import AuthLayout from "@/components/auth/AuthLayout";
import PasswordStrengthMeter from "@/components/auth/PasswordStrengthMeter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api, { formatApiError } from "@/lib/api";
import { getPasswordPolicyError } from "@/lib/passwordPolicy";
import { toast } from "sonner";
import ECGLoader from "@/components/animations/ECGLoader";
import SecurityShieldAnimation from "@/components/animations/SecurityShieldAnimation";
import SuccessCheckAnimation from "@/components/animations/SuccessCheckAnimation";

const RESET_EMAIL_KEY = "medassist:reset-email";
const RESET_TOKEN_KEY = "medassist:reset-token";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const storedEmail =
    typeof window !== "undefined" ? window.sessionStorage.getItem(RESET_EMAIL_KEY) || "" : "";
  const storedToken =
    typeof window !== "undefined" ? window.sessionStorage.getItem(RESET_TOKEN_KEY) || "" : "";

  const email = useMemo(() => searchParams.get("email") || storedEmail, [searchParams, storedEmail]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const passwordError = getPasswordPolicyError(password);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    if (!storedToken || !email) {
      toast.error("Your reset session is missing. Start again from forgot password.");
      return;
    }

    setBusy(true);
    try {
      await api.post("/auth/reset-password", {
        email,
        reset_token: storedToken,
        password,
      });
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(RESET_EMAIL_KEY);
        window.sessionStorage.removeItem(RESET_TOKEN_KEY);
      }
      setSuccess(true);
      toast.success("Password changed");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Reset password"
      title="Choose a new password."
      description="Create a strong new password for your MedAssist account and we will close the older refresh sessions."
      quote='"Good security gives you a clean reset."'
      quoteSource="Account recovery"
    >
      {!email || !storedToken ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <h2 className="font-serif text-3xl text-primary">Reset session missing</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Verify your reset code again before setting a new password.
          </p>
          <Link to="/forgot-password" className="mt-6 inline-block">
            <Button className="rounded-full">Restart password recovery</Button>
          </Link>
        </div>
      ) : success ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <SuccessCheckAnimation />
          <h2 className="mt-5 font-serif text-3xl text-primary">Password changed</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Your password is updated and previous refresh sessions were invalidated. Sign in with the
            new password to continue.
          </p>
          <Button className="mt-6 w-full rounded-full" onClick={() => navigate("/login")}>
            Continue to sign in
          </Button>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-3">
              <SecurityShieldAnimation />
              <div>
                Resetting password for <span className="font-medium text-primary">{email}</span>
              </div>
            </div>
          </div>

          <form onSubmit={submit} className="mt-5 space-y-4">
            <div>
              <Label htmlFor="password">New password</Label>
              <div className="relative mt-1">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  className="pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute inset-y-0 right-3 text-muted-foreground hover:text-primary"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="confirm-password">Confirm password</Label>
              <div className="relative mt-1">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  className="pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  className="absolute inset-y-0 right-3 text-muted-foreground hover:text-primary"
                  aria-label={showConfirmPassword ? "Hide confirmation password" : "Show confirmation password"}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword && confirmPassword !== password ? (
                <div className="mt-2 text-xs text-destructive">Passwords need to match exactly.</div>
              ) : null}
            </div>

            <PasswordStrengthMeter password={password} />

            <Button type="submit" disabled={busy} className="w-full rounded-full">
              {busy ? "Updating password..." : "Update password"}
            </Button>
            {busy ? <ECGLoader message="Updating password..." /> : null}
          </form>

          <p className="mt-6 text-sm text-muted-foreground">
            Need a new code?{" "}
            <Link to="/forgot-password" className="text-primary underline underline-offset-4">
              Restart password recovery
            </Link>
          </p>
        </>
      )}
    </AuthLayout>
  );
}
