import PublicPageLayout from "@/components/PublicPageLayout";

export default function PrivacyPolicy() {
  return (
    <PublicPageLayout
      eyebrow="Privacy Policy"
      title="Your symptom history should stay private, reviewable, and under your control."
      description="This policy page summarizes the data MedAssist stores inside the application experience and how users should think about report privacy in this deployment."
    >
      <section className="space-y-6">
        {[
          {
            title: "Account information",
            body: "MedAssist stores account identity such as your name, email address, verification state, and security session metadata so you can sign in safely and manage devices.",
          },
          {
            title: "Medical context",
            body: "Diagnosis reports may include symptoms, notes, profile snapshots like allergies or existing diseases, and AI-generated medical guidance. This information is visible within your authenticated report history.",
          },
          {
            title: "User control",
            body: "You can review profile data, manage sessions, and delete reports from your history inside the application. Sensitive account deletion flows should only be enabled when a dedicated backend endpoint exists.",
          },
        ].map((item) => (
          <article key={item.title} className="rounded-xl border border-border bg-muted/30 p-5">
            <h2 className="font-serif text-2xl text-primary">{item.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
          </article>
        ))}
      </section>
    </PublicPageLayout>
  );
}
