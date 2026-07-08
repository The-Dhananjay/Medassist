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

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email, password);
      toast.success("Welcome back");
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
              "The best care starts with being heard. This is where you begin."
            </p>
            <div className="mt-3 overline opacity-80">— Product principle</div>
          </blockquote>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <span className="overline text-muted-foreground">Sign in</span>
          <h1 className="mt-2 font-serif text-4xl text-primary">Welcome back.</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Continue where you left off with your health journal.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4" data-testid="login-form">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email" type="email" value={email} required
                onChange={(e) => setEmail(e.target.value)}
                data-testid="login-email-input" className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password" type="password" value={password} required
                onChange={(e) => setPassword(e.target.value)}
                data-testid="login-password-input" className="mt-1"
              />
            </div>
            <Button
              type="submit" disabled={busy}
              className="w-full rounded-full" data-testid="login-submit-button"
            >
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 text-sm text-muted-foreground">
            No account?{" "}
            <Link to="/register" className="text-primary underline underline-offset-4" data-testid="login-to-register-link">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
