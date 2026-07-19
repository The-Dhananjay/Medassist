import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import AuthLayout from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import SuccessCheckAnimation from "@/components/animations/SuccessCheckAnimation";

const PENDING_EMAIL_KEY = "medassist:pending-email";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await login(email, password);
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(PENDING_EMAIL_KEY);
      }
      setSuccess(true);
      toast.success("Welcome back");
      window.setTimeout(() => navigate("/dashboard"), 650);
    } catch (err) {
      const message = formatApiError(err);
      if (err?.response?.status === 403 && message.toLowerCase().includes("verify")) {
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(PENDING_EMAIL_KEY, email);
        }
        toast.error(message);
        navigate(`/verify-email?email=${encodeURIComponent(email)}`);
      } else {
        toast.error(message);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Sign in"
      title="Welcome back."
      description="Continue where you left off with your health journal and secure session history."
      quote='"The best care starts with being heard. This is where you begin."'
      quoteSource="Product principle"
    >
      <form onSubmit={submit} className="space-y-4" data-testid="login-form">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            required
            onChange={(event) => setEmail(event.target.value)}
            data-testid="login-email-input"
            className="mt-1"
          />
        </div>

        <div>
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              to="/forgot-password"
              className="text-xs text-primary underline underline-offset-4"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            value={password}
            required
            onChange={(event) => setPassword(event.target.value)}
            data-testid="login-password-input"
            className="mt-1"
          />
        </div>

        <Button
          type="submit"
          disabled={busy}
          className="w-full rounded-full"
          data-testid="login-submit-button"
        >
          {busy ? "Signing in..." : "Sign in"}
        </Button>
        {success ? <SuccessCheckAnimation /> : null}
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        No account?{" "}
        <Link
          to="/register"
          className="text-primary underline underline-offset-4"
          data-testid="login-to-register-link"
        >
          Create one
        </Link>
      </p>
    </AuthLayout>
  );
}
