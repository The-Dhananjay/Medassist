import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, RefreshCw, ShieldCheck } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import AuthLayout from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";

const PENDING_EMAIL_KEY = "medassist:pending-email";

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const storedEmail =
    typeof window !== "undefined" ? window.sessionStorage.getItem(PENDING_EMAIL_KEY) || "" : "";
  const initialEmail = useMemo(
    () => searchParams.get("email") || storedEmail,
    [searchParams, storedEmail]
  );

  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [cooldown, setCooldown] = useState(initialEmail ? 60 : 0);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = window.setInterval(() => {
      setCooldown((current) => (current > 0 ? current - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (email) {
      window.sessionStorage.setItem(PENDING_EMAIL_KEY, email);
    }
  }, [email]);

  const verify = async (event) => {
    event.preventDefault();
    if (!email) {
      toast.error("Enter your email first.");
      return;
    }
    if (otp.length !== 6) {
      toast.error("Enter the 6-digit code we sent you.");
      return;
    }

    setBusy(true);
    try {
      await api.post("/auth/verify-email", { email, otp });
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(PENDING_EMAIL_KEY);
      }
      setVerified(true);
      toast.success("Email verified");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (!email) {
      toast.error("Enter your email first.");
      return;
    }
    setResending(true);
    try {
      await api.post("/auth/resend-verification", { email });
      setOtp("");
      setCooldown(60);
      toast.success("A fresh verification code is on the way.");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Verify email"
      title="Activate your account."
      description="Enter the one-time password from your inbox to finish registration and unlock sign-in."
      quote='"Trust starts with a verified connection."'
      quoteSource="Security principle"
    >
      {verified ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-secondary text-primary animate-pulse">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h2 className="mt-5 font-serif text-3xl text-primary">Email verified</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Your MedAssist account is now active. You can sign in and start using secure sessions.
          </p>
          <Button className="mt-6 w-full rounded-full" onClick={() => navigate("/login")}>
            Continue to sign in
          </Button>
        </div>
      ) : (
        <>
          <form onSubmit={verify} className="space-y-5">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1"
                placeholder="you@example.com"
              />
            </div>

            <div className="rounded-xl border border-border bg-muted/40 p-4">
              <div className="flex items-center gap-2 text-primary">
                <ShieldCheck className="h-4 w-4" />
                <div className="overline">Verification code</div>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Paste the 6-digit code from your email. It expires in 10 minutes.
              </p>
              <div className="mt-4 flex justify-center sm:justify-start">
                <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                  <InputOTPGroup>
                    {Array.from({ length: 6 }).map((_, index) => (
                      <InputOTPSlot key={index} index={index} className="h-12 w-11 text-base" />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>

            <Button type="submit" disabled={busy} className="w-full rounded-full">
              {busy ? "Verifying..." : "Verify email"}
            </Button>
          </form>

          <div className="mt-6 flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-medium text-primary">Need another code?</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {cooldown > 0
                  ? `You can request a new code in ${cooldown}s.`
                  : "You can resend a fresh verification code now."}
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={cooldown > 0 || resending}
              onClick={resend}
              className="rounded-full"
            >
              {resending ? (
                "Sending..."
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" /> Resend code
                </>
              )}
            </Button>
          </div>

          <p className="mt-6 text-sm text-muted-foreground">
            Already verified?{" "}
            <Link to="/login" className="text-primary underline underline-offset-4">
              Return to sign in
            </Link>
          </p>
        </>
      )}
    </AuthLayout>
  );
}
