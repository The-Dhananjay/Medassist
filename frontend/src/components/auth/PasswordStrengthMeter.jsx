import { CheckCircle2, Dot } from "lucide-react";

import { getPasswordChecks, getPasswordStrength } from "@/lib/passwordPolicy";
import { cn } from "@/lib/utils";

export default function PasswordStrengthMeter({ password }) {
  const checks = getPasswordChecks(password);
  const strength = getPasswordStrength(password);

  return (
    <div className="rounded-xl border border-border bg-muted/40 p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm font-medium text-primary">Password strength</div>
        <div className="text-xs text-muted-foreground">{strength.label}</div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-primary/10">
        <div
          className={cn("h-full rounded-full transition-all duration-300", strength.tone)}
          style={{ width: `${Math.max(strength.score, password ? 12 : 0)}%` }}
        />
      </div>
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {checks.map((check) => (
          <div
            key={check.label}
            className={cn(
              "flex items-center gap-2 text-xs",
              check.passed ? "text-primary" : "text-muted-foreground"
            )}
          >
            {check.passed ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <Dot className="h-4 w-4" />
            )}
            <span>{check.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
