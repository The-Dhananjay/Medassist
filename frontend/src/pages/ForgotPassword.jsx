import { useEffect, useState } from "react";
import { ArrowRight, MailCheck, RefreshCw } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import AuthLayout from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";

const RESET_EMAIL_KEY = "medassist:reset-email";
const RESET_TOKEN_KEY = "medassist:reset-token";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const storedEmail =
    typeof window !== "undefined" ? window.sessionStorage.getItem(RESET_EMAIL_KEY) || "" : "";

  const [step, setStep] = useState("request");
  const [email, setEmail] = useState(storedEmail);
  const [otp, setOtp] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = window.setInterval(() => {
      setCooldown((current) => (current > 0 ? current - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const requestReset = async (event) => {
    event.preventDefault();
    setSending(true);
    try {
      await api.post("/auth/forgot-password", { email });
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(RESET_EMAIL_KEY, email);
        window.sessionStorage.removeItem(RESET_TOKEN_KEY);
      }
      setStep("verify");
      setCooldown(60);
      toast.success("If the account exists, a code is on the way.");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSending(false);
    }
  };

  const verifyOtp = async (event) => {
    event.preventDefault();
    if (otp.length !== 6) {
      toast.error("Enter the 6-digit reset code.");
      return;
    }

    setVerifying(true);
    try {
      const { data } = await api.post("/auth/verify-reset-otp", { email, otp });
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(RESET_EMAIL_KEY, email);
        window.sessionStorage.setItem(RESET_TOKEN_KEY, data.reset_token);
      }
      toast.success("Code confirmed");
      navigate(`/reset-password?email=${encodeURIComponent(email)}`);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setVerifying(false);
    }
  };

  const resendCode = async () => {
    setResending(true);
    try {
      await api.post("/auth/resend-reset-otp", { email });
      setOtp("");
      setCooldown(60);
      toast.success("A fresh reset code is on the way.");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Forgot password"
      title="Recover access safely."
      description="We will verify your identity with a one-time password before you choose a new password."
      quote='"Recovery should feel secure, not stressful."'
      quoteSource="Account security"
    >
      {step === "request" ? (
        <>
          <form onSubmit={requestReset} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="mt-1"
                placeholder="you@example.com"
              />
            </div>

            <Button type="submit" disabled={sending} className="w-full rounded-full">
              {sending ? "Sending code..." : "Send reset code"}
            </Button>
          </form>

          <p className="mt-6 text-sm text-muted-foreground">
            Remembered it?{" "}
            <Link to="/login" className="text-primary underline underline-offset-4">
              Return to sign in
            </Link>
          </p>
        </>
      ) : (
        <>
          <div className="rounded-xl border border-border bg-muted/40 p-4">
            <div className="flex items-center gap-2 text-primary">
              <MailCheck className="h-4 w-4" />
              <div className="overline">OTP sent</div>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter the 6-digit reset code sent to <span className="font-medium text-primary">{email}</span>.
            </p>
          </div>

          <form onSubmit={verifyOtp} className="mt-5 space-y-5">
            <div className="flex justify-center sm:justify-start">
              <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                <InputOTPGroup>
                  {Array.from({ length: 6 }).map((_, index) => (
                    <InputOTPSlot key={index} index={index} className="h-12 w-11 text-base" />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>

            <Button type="submit" disabled={verifying} className="w-full rounded-full">
              {verifying ? "Checking code..." : "Verify code"}
            </Button>
          </form>

          <div className="mt-6 flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              {cooldown > 0 ? `You can resend in ${cooldown}s.` : "Need another code?"}
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={cooldown > 0 || resending}
              onClick={resendCode}
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

          <button
            type="button"
            onClick={() => setStep("request")}
            className="mt-6 inline-flex items-center gap-2 text-sm text-primary underline underline-offset-4"
          >
            Use another email <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </>
      )}
    </AuthLayout>
  );
}
