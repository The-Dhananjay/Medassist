export function getPasswordChecks(password = "") {
  return [
    { label: "8-128 characters", passed: password.length >= 8 && password.length <= 128 },
    { label: "Uppercase letter", passed: /[A-Z]/.test(password) },
    { label: "Lowercase letter", passed: /[a-z]/.test(password) },
    { label: "Number", passed: /\d/.test(password) },
    { label: "Special character", passed: /[^A-Za-z0-9]/.test(password) },
  ];
}

export function getPasswordStrength(password = "") {
  const checks = getPasswordChecks(password);
  const passedChecks = checks.filter((check) => check.passed).length;
  const score = password ? Math.round((passedChecks / checks.length) * 100) : 0;

  if (!password) {
    return { label: "Enter a password", score: 0, tone: "bg-primary/15" };
  }
  if (passedChecks <= 2) {
    return { label: "Too weak", score, tone: "bg-destructive" };
  }
  if (passedChecks <= 4) {
    return { label: "Good start", score, tone: "bg-amber-500" };
  }
  return { label: "Strong password", score, tone: "bg-emerald-500" };
}

export function getPasswordPolicyError(password = "") {
  const valid = getPasswordChecks(password).every((check) => check.passed);
  if (valid) return "";
  return "Password must be 8 to 128 characters and include uppercase, lowercase, a number, and a special character.";
}
