import PublicPageLayout from "@/components/PublicPageLayout";

export default function About() {
  return (
    <PublicPageLayout
      eyebrow="About MedAssist"
      title="Built to make symptom triage calmer, clearer, and more structured."
      description="MedAssist helps people capture symptoms quickly, review AI-guided possibilities, and understand when home care may be enough or when professional attention matters."
    >
      <section className="grid gap-5 md:grid-cols-3">
        {[
          {
            title: "Human-centered design",
            body: "Every screen is designed to keep medical information legible, calm, and actionable without overwhelming patients.",
          },
          {
            title: "Structured AI reports",
            body: "Reports package likely conditions, possible causes, remedies, precautions, and doctor cues into one reusable record.",
          },
          {
            title: "Account security",
            body: "Verified email, session awareness, and secure account flows help protect medical history across devices.",
          },
        ].map((item) => (
          <article key={item.title} className="rounded-xl border border-border bg-muted/30 p-5">
            <h2 className="font-serif text-2xl text-primary">{item.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
          </article>
        ))}
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-serif text-2xl text-primary">What MedAssist is and is not</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          MedAssist is an AI-assisted triage companion. It helps organize symptoms and highlight useful next
          steps, but it does not replace licensed medical diagnosis or treatment. Urgent symptoms, severe pain,
          breathing trouble, chest pain, or rapidly worsening conditions should always be escalated to a clinician
          or emergency services immediately.
        </p>
      </section>
    </PublicPageLayout>
  );
}
