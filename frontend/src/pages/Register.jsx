import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import AuthLayout from "@/components/auth/AuthLayout";
import PasswordStrengthMeter from "@/components/auth/PasswordStrengthMeter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { formatApiError } from "@/lib/api";
import { getPasswordPolicyError } from "@/lib/passwordPolicy";
import { toast } from "sonner";

const PENDING_EMAIL_KEY = "medassist:pending-email";
const PENDING_PASSWORD_KEY = "medassist:pending-password";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    age: "",
    gender: "",
  });
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const setField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    const passwordError = getPasswordPolicyError(form.password);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }

    setBusy(true);
    try {
      await register({
        name: form.name,
        email: form.email,
        password: form.password,
        age: form.age ? Number(form.age) : null,
        gender: form.gender || null,
      });
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(PENDING_EMAIL_KEY, form.email);
        window.sessionStorage.setItem(PENDING_PASSWORD_KEY, form.password);
      }
      toast.success("Verification code sent");
      navigate(`/verify-email?email=${encodeURIComponent(form.email)}`);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Create account"
      title="Start your journal."
      description="Create your MedAssist account, verify your email, and keep your diagnosis history protected."
      quote='"A quiet second opinion, before the first appointment."'
      quoteSource="How MedAssist thinks"
    >
      <form onSubmit={submit} className="space-y-4" data-testid="register-form">
        <div>
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            required
            value={form.name}
            onChange={(event) => setField("name", event.target.value)}
            data-testid="register-name-input"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={form.email}
            onChange={(event) => setField("email", event.target.value)}
            data-testid="register-email-input"
            className="mt-1"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="age">Age</Label>
            <Input
              id="age"
              type="number"
              min="1"
              value={form.age}
              onChange={(event) => setField("age", event.target.value)}
              data-testid="register-age-input"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="gender">Gender</Label>
            <select
              id="gender"
              value={form.gender}
              onChange={(event) => setField("gender", event.target.value)}
              data-testid="register-gender-select"
              className="mt-1 h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option value="">Prefer not to say</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div>
          <Label htmlFor="password">Password</Label>
          <div className="relative mt-1">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              value={form.password}
              onChange={(event) => setField("password", event.target.value)}
              data-testid="register-password-input"
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

        <PasswordStrengthMeter password={form.password} />

        <Button
          type="submit"
          disabled={busy}
          className="w-full rounded-full"
          data-testid="register-submit-button"
        >
          {busy ? "Creating..." : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        Already registered?{" "}
        <Link
          to="/login"
          className="text-primary underline underline-offset-4"
          data-testid="register-to-login-link"
        >
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
