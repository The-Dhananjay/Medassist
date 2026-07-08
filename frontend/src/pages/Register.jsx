import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatApiError } from "@/lib/api";
import { Stethoscope } from "lucide-react";

const SIDE_IMG = "https://images.unsplash.com/photo-1597496610123-889e0aab4816?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2Mzl8MHwxfHNlYXJjaHwyfHxtZWRpY2FsJTIwdGVjaG5vbG9neSUyMGFic3RyYWN0JTIwYmx1ZSUyMHRvbmV8ZW58MHx8fHwxNzgzNTEyMDM3fDA&ixlib=rb-4.1.0&q=85";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", age: "", gender: "" });
  const [busy, setBusy] = useState(false);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return toast.error("Password must be at least 6 characters.");
    setBusy(true);
    try {
      await register({
        name: form.name,
        email: form.email,
        password: form.password,
        age: form.age ? Number(form.age) : null,
        gender: form.gender || null,
      });
      toast.success("Account created");
      navigate("/dashboard");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      <div className="hidden lg:block relative">
        <img src={SIDE_IMG} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-primary/40" />
        <div className="relative z-10 h-full flex flex-col justify-between p-10 text-primary-foreground">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-background/95 text-primary grid place-items-center">
              <Stethoscope className="w-4 h-4" />
            </div>
            <div className="font-serif text-lg">MedAssist</div>
          </div>
          <blockquote className="max-w-md">
            <p className="font-serif text-3xl leading-tight">
              "A quiet second opinion, before the first appointment."
            </p>
            <div className="mt-3 overline opacity-80">— How MedAssist thinks</div>
          </blockquote>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <span className="overline text-muted-foreground">Create account</span>
          <h1 className="mt-2 font-serif text-4xl text-primary">Start your journal.</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Free forever. Your data belongs to you.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4" data-testid="register-form">
            <div>
              <Label htmlFor="name">Full name</Label>
              <Input id="name" required value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                data-testid="register-name-input" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                data-testid="register-email-input" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="age">Age</Label>
                <Input id="age" type="number" min="1" value={form.age}
                  onChange={(e) => setField("age", e.target.value)}
                  data-testid="register-age-input" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="gender">Gender</Label>
                <select
                  id="gender" value={form.gender}
                  onChange={(e) => setField("gender", e.target.value)}
                  data-testid="register-gender-select"
                  className="mt-1 w-full h-10 rounded-md border border-input bg-transparent px-3 text-sm"
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
              <Input id="password" type="password" required minLength={6} value={form.password}
                onChange={(e) => setField("password", e.target.value)}
                data-testid="register-password-input" className="mt-1" />
            </div>

            <Button type="submit" disabled={busy}
              className="w-full rounded-full" data-testid="register-submit-button">
              {busy ? "Creating…" : "Create account"}
            </Button>
          </form>

          <p className="mt-6 text-sm text-muted-foreground">
            Already registered?{" "}
            <Link to="/login" className="text-primary underline underline-offset-4" data-testid="register-to-login-link">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
