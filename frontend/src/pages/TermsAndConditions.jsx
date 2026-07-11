import PublicPageLayout from "@/components/PublicPageLayout";

export default function TermsAndConditions() {
  return (
    <PublicPageLayout
      eyebrow="Terms & Conditions"
      title="Use MedAssist as a medical information aid, not as a substitute for professional care."
      description="These terms outline how the application should be used and the boundaries of the AI-generated output it produces."
    >
      <section className="space-y-6">
        {[
          {
            title: "Informational use only",
            body: "MedAssist reports are intended to support early understanding, note-taking, and communication. They do not establish a diagnosis and must not delay emergency care.",
          },
          {
            title: "Responsible account use",
            body: "Users are responsible for maintaining accurate profile details, protecting their session access, and reviewing the devices signed into their account.",
          },
          {
            title: "No emergency guarantee",
            body: "Although MedAssist flags some urgent patterns, emergency recognition is not guaranteed. If symptoms feel severe, unusual, or fast-moving, seek licensed care immediately.",
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
