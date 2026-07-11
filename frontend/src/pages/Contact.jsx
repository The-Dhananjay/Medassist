import { Link } from "react-router-dom";

import PublicPageLayout from "@/components/PublicPageLayout";
import { Button } from "@/components/ui/button";

export default function Contact() {
  return (
    <PublicPageLayout
      eyebrow="Contact"
      title="Need help navigating the app or reviewing account access?"
      description="This deployment does not expose a dedicated support inbox inside the codebase, so the safest contact guidance is routed through the product owner or administrator who provided access."
    >
      <section className="grid gap-5 md:grid-cols-3">
        <article className="rounded-xl border border-border bg-muted/30 p-5">
          <h2 className="font-serif text-2xl text-primary">Access issues</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            If sign-in, verification, or password recovery stops working, start with the existing account flows
            before escalating to the deployment owner.
          </p>
          <Link to="/forgot-password" className="mt-4 inline-block">
            <Button variant="outline" className="rounded-full">Password recovery</Button>
          </Link>
        </article>
        <article className="rounded-xl border border-border bg-muted/30 p-5">
          <h2 className="font-serif text-2xl text-primary">Security review</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Review active browsers and devices in the session manager whenever something looks unfamiliar.
          </p>
          <Link to="/sessions" className="mt-4 inline-block">
            <Button variant="outline" className="rounded-full">Open sessions</Button>
          </Link>
        </article>
        <article className="rounded-xl border border-border bg-muted/30 p-5">
          <h2 className="font-serif text-2xl text-primary">Product questions</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            For feature requests or deployment-specific help, contact the project owner or administrator who
            shared this MedAssist instance with you.
          </p>
        </article>
      </section>
    </PublicPageLayout>
  );
}
